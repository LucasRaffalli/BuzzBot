# Guide des Permissions pour BuzzBot

## Problème EACCES sur Linux

Si vous obtenez l'erreur `EACCES: permission denied` sur `/home/lucas/Discord/buzzbot/data/events.json`, voici comment la résoudre.

## Solution rapide

```bash
cd /home/lucas/Discord/buzzbot
chmod +x fix-permissions.sh
./fix-permissions.sh
pm2 restart buzzbot
```

## Solution manuelle détaillée

### 1. Vérifier les permissions actuelles

```bash
cd /home/lucas/Discord/buzzbot
ls -la data/
```

### 2. Créer le dossier data si nécessaire

```bash
mkdir -p data
```

### 3. Donner les permissions CRUD

**Pour le dossier data/ :**
```bash
chmod 755 data
```
- `7` (propriétaire) = Read + Write + Execute (rwx)
- `5` (groupe) = Read + Execute (r-x)
- `5` (autres) = Read + Execute (r-x)

**Pour les fichiers JSON :**
```bash
chmod 644 data/*.json
```
- `6` (propriétaire) = Read + Write (rw-)
- `4` (groupe) = Read (r--)
- `4` (autres) = Read (r--)

### 4. Changer le propriétaire (si nécessaire)

Si le bot tourne sous l'utilisateur `lucas` :
```bash
chown -R lucas:lucas data
```

Si vous utilisez PM2, le bot tourne sous votre utilisateur actuel :
```bash
whoami  # Affiche votre utilisateur
chown -R $(whoami):$(whoami) data
```

### 5. Vérifier les permissions

```bash
ls -la data/
```

Vous devriez voir :
```
drwxr-xr-x  2 lucas lucas 4096 Nov  7 12:00 data/
-rw-r--r--  1 lucas lucas  512 Nov  7 12:00 events.json
-rw-r--r--  1 lucas lucas 1024 Nov  7 12:00 leaderboard.json
```

### 6. Redémarrer le bot

**Avec PM2 :**
```bash
pm2 restart buzzbot
pm2 logs buzzbot
```

**Avec Node.js direct :**
```bash
# Arrêter le bot (Ctrl+C)
node index.js
```

## Explication des permissions

### Format chmod (numérique)

- `4` = Read (r)
- `2` = Write (w)
- `1` = Execute (x)

Les chiffres se cumulent :
- `7` = 4+2+1 = rwx (lecture + écriture + exécution)
- `6` = 4+2 = rw- (lecture + écriture)
- `5` = 4+1 = r-x (lecture + exécution)
- `4` = 4 = r-- (lecture seule)

### Pourquoi 755 pour data/ ?

- Le bot doit pouvoir **lire** le dossier (4)
- Le bot doit pouvoir **créer des fichiers** dedans (2)
- Le bot doit pouvoir **naviguer** dans le dossier (1)
- Total = 7 pour le propriétaire

### Pourquoi 644 pour les JSON ?

- Le bot doit pouvoir **lire** les fichiers (4)
- Le bot doit pouvoir **modifier** les fichiers (2)
- Pas besoin d'exécuter un fichier JSON (0)
- Total = 6 pour le propriétaire

## Mode dégradé

Si vous ne pouvez pas corriger les permissions, le bot continuera de fonctionner en **mode dégradé** :
- ✅ Toutes les fonctionnalités marchent
- ⚠️ Les données sont perdues au redémarrage
- ⚠️ Pas de persistance du leaderboard
- ⚠️ Pas de restauration des événements

Vous verrez ces messages dans les logs :
```
⚠️ Impossible de créer/écrire dans le dossier data: EACCES...
⚠️ Persistance désactivée - les événements seront perdus au redémarrage!
```

## Dépannage avancé

### Vérifier qui exécute le bot

```bash
ps aux | grep node
```

### Vérifier les permissions du processus PM2

```bash
pm2 list
pm2 show buzzbot
```

### Si le dossier appartient à root

```bash
sudo chown -R lucas:lucas /home/lucas/Discord/buzzbot/data
```

### Si SELinux bloque l'accès (CentOS/RHEL)

```bash
# Vérifier si SELinux est actif
getenforce

# Autoriser l'écriture
sudo chcon -R -t httpd_sys_rw_content_t /home/lucas/Discord/buzzbot/data

# Ou désactiver SELinux temporairement (pas recommandé)
sudo setenforce 0
```
