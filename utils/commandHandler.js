const fs = require('fs');
const path = require('path');

module.exports = (client) => {
    const commandsPath = path.join(__dirname, '../commands');
    
    // Vérifier si le dossier commands existe
    if (!fs.existsSync(commandsPath)) {
        console.warn('⚠️ Le dossier commands n\'existe pas');
        return;
    }
    
    const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));
    
    if (commandFiles.length === 0) {
        console.warn('⚠️ Aucune commande trouvée dans le dossier commands');
        return;
    }
    
    let loadedCommands = 0;
    
    for (const file of commandFiles) {
        try {
            const filePath = path.join(commandsPath, file);
            const command = require(filePath);
            
            // Vérifier que la commande a les propriétés requises
            if ('data' in command && 'execute' in command) {
                client.commands.set(command.data.name, command);
                loadedCommands++;
                console.log(`   ✓ Commande chargée: ${command.data.name}`);
            } else {
                console.warn(`   ⚠️ La commande ${file} est mal formatée`);
            }
        } catch (error) {
            console.error(`   ❌ Erreur lors du chargement de ${file}:`, error.message);
        }
    }
    
    console.log(`📝 ${loadedCommands} commande(s) chargée(s)`);
};
