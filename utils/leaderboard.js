const fs = require('fs');
const path = require('path');

const LEADERBOARD_FILE = path.join(__dirname, '../data/leaderboard.json');
let persistenceEnabled = true;

// Créer le dossier data s'il n'existe pas
const ensureDataDir = () => {
    const dataDir = path.join(__dirname, '../data');
    try {
        if (!fs.existsSync(dataDir)) {
            fs.mkdirSync(dataDir, { recursive: true, mode: 0o755 });
        }
        // Tester les permissions d'écriture
        const testFile = path.join(dataDir, '.write-test');
        fs.writeFileSync(testFile, 'test');
        fs.unlinkSync(testFile);
        return true;
    } catch (error) {
        console.error('⚠️ Impossible de créer/écrire dans le dossier data:', error.message);
        console.error('⚠️ Persistance du leaderboard désactivée!');
        persistenceEnabled = false;
        return false;
    }
};

// Charger le leaderboard depuis le fichier
const loadLeaderboard = () => {
    if (!persistenceEnabled || !ensureDataDir()) {
        return {};
    }
    
    try {
        if (fs.existsSync(LEADERBOARD_FILE)) {
            const data = fs.readFileSync(LEADERBOARD_FILE, 'utf8');
            return JSON.parse(data);
        }
    } catch (error) {
        console.error('❌ Erreur lors du chargement du leaderboard:', error.message);
    }
    
    // Structure par défaut: { guildId: { userId: { username, wins, lastWin } } }
    return {};
};

// Sauvegarder le leaderboard dans le fichier
const saveLeaderboard = (leaderboard) => {
    if (!persistenceEnabled || !ensureDataDir()) {
        return false;
    }
    
    try {
        fs.writeFileSync(LEADERBOARD_FILE, JSON.stringify(leaderboard, null, 2), 'utf8');
        return true;
    } catch (error) {
        console.error('❌ Erreur lors de la sauvegarde du leaderboard:', error.message);
        console.error('⚠️ Vérifiez les permissions du dossier data/');
        return false;
    }
};

// Ajouter une victoire pour un utilisateur
const addWin = (guildId, userId, username) => {
    const leaderboard = loadLeaderboard();
    
    // Initialiser le serveur si nécessaire
    if (!leaderboard[guildId]) {
        leaderboard[guildId] = {};
    }
    
    // Initialiser l'utilisateur si nécessaire
    if (!leaderboard[guildId][userId]) {
        leaderboard[guildId][userId] = {
            username: username,
            wins: 0,
            lastWin: null,
            attacksUsed: 0
        };
    }
    
    // Ajouter la victoire
    leaderboard[guildId][userId].wins++;
    leaderboard[guildId][userId].username = username; // Mettre à jour le pseudo
    leaderboard[guildId][userId].lastWin = new Date().toISOString();
    
    // Sauvegarder
    saveLeaderboard(leaderboard);
    
    return leaderboard[guildId][userId].wins;
};

// Obtenir le classement d'un serveur
const getGuildLeaderboard = (guildId, limit = 10) => {
    const leaderboard = loadLeaderboard();
    
    if (!leaderboard[guildId]) {
        return [];
    }
    
    // Convertir en tableau et trier par nombre de victoires
    const sorted = Object.entries(leaderboard[guildId])
        .map(([userId, data]) => ({
            userId,
            username: data.username,
            wins: data.wins,
            lastWin: data.lastWin
        }))
        .sort((a, b) => b.wins - a.wins)
        .slice(0, limit);
    
    return sorted;
};

// Obtenir les stats d'un utilisateur
const getUserStats = (guildId, userId) => {
    const leaderboard = loadLeaderboard();
    
    if (!leaderboard[guildId] || !leaderboard[guildId][userId]) {
        return null;
    }
    
    const stats = leaderboard[guildId][userId];
    
    // Calculer le rang
    const allUsers = Object.entries(leaderboard[guildId])
        .sort(([, a], [, b]) => b.wins - a.wins);
    
    const rank = allUsers.findIndex(([id]) => id === userId) + 1;
    
    return {
        ...stats,
        rank,
        totalPlayers: allUsers.length
    };
};

// Réinitialiser le leaderboard d'un serveur
const resetGuildLeaderboard = (guildId) => {
    const leaderboard = loadLeaderboard();
    
    if (leaderboard[guildId]) {
        delete leaderboard[guildId];
        saveLeaderboard(leaderboard);
        return true;
    }
    
    return false;
};

// Utiliser une attaque
const useAttack = (guildId, userId, username) => {
    const leaderboard = loadLeaderboard();
    
    // Initialiser le serveur si nécessaire
    if (!leaderboard[guildId]) {
        leaderboard[guildId] = {};
    }
    
    // Initialiser l'utilisateur si nécessaire
    if (!leaderboard[guildId][userId]) {
        leaderboard[guildId][userId] = {
            username: username,
            wins: 0,
            lastWin: null,
            attacksUsed: 0
        };
    }
    
    // Vérifier la limite d'attaques (par défaut 3)
    const ATTACK_LIMIT = 3;
    if (leaderboard[guildId][userId].attacksUsed >= ATTACK_LIMIT) {
        return { 
            success: false, 
            remaining: 0,
            limit: ATTACK_LIMIT
        };
    }
    
    // Incrémenter les attaques utilisées
    leaderboard[guildId][userId].attacksUsed++;
    leaderboard[guildId][userId].username = username; // Mettre à jour le pseudo
    
    saveLeaderboard(leaderboard);
    
    return { 
        success: true, 
        remaining: ATTACK_LIMIT - leaderboard[guildId][userId].attacksUsed,
        limit: ATTACK_LIMIT
    };
};

// Obtenir le nombre d'attaques restantes
const getRemainingAttacks = (guildId, userId) => {
    const leaderboard = loadLeaderboard();
    const ATTACK_LIMIT = 3;
    
    if (!leaderboard[guildId] || !leaderboard[guildId][userId]) {
        return ATTACK_LIMIT;
    }
    
    const attacksUsed = leaderboard[guildId][userId].attacksUsed || 0;
    return Math.max(0, ATTACK_LIMIT - attacksUsed);
};

// Retirer des points à un utilisateur
const removePoints = (guildId, userId, pointsToRemove) => {
    const leaderboard = loadLeaderboard();
    
    if (!leaderboard[guildId] || !leaderboard[guildId][userId]) {
        return { success: false, message: 'Utilisateur non trouvé dans le leaderboard' };
    }
    
    const currentWins = leaderboard[guildId][userId].wins;
    
    if (currentWins < pointsToRemove) {
        return { 
            success: false, 
            message: `L'utilisateur n'a que ${currentWins} point${currentWins > 1 ? 's' : ''}, impossible de retirer ${pointsToRemove} point${pointsToRemove > 1 ? 's' : ''}`,
            currentPoints: currentWins
        };
    }
    
    leaderboard[guildId][userId].wins -= pointsToRemove;
    
    // Si l'utilisateur arrive à 0 points, on peut le garder dans le leaderboard
    // pour garder l'historique
    
    saveLeaderboard(leaderboard);
    
    return { 
        success: true, 
        newTotal: leaderboard[guildId][userId].wins 
    };
};

module.exports = {
    loadLeaderboard,
    saveLeaderboard,
    addWin,
    getGuildLeaderboard,
    getUserStats,
    resetGuildLeaderboard,
    removePoints,
    useAttack,
    getRemainingAttacks
};
