#!/bin/bash

# Script pour corriger les permissions du dossier data
# Utilisez ce script sur votre serveur Linux

echo "🔧 Correction des permissions pour BuzzBot..."

# Créer le dossier data s'il n'existe pas
mkdir -p data

# Permissions CRUD sur le dossier data:
# 7 (rwx) = Read + Write + Execute pour le propriétaire
# 5 (r-x) = Read + Execute pour le groupe
# 5 (r-x) = Read + Execute pour les autres
chmod 755 data

# Permissions CRUD sur les fichiers JSON:
# 6 (rw-) = Read + Write pour le propriétaire
# 4 (r--) = Read pour le groupe
# 4 (r--) = Read pour les autres
chmod 644 data/*.json 2>/dev/null || true

# Changer le propriétaire si besoin (remplacez 'lucas' par votre utilisateur)
# chown -R lucas:lucas data

echo "✅ Permissions corrigées!"
echo ""
echo "📁 Permissions du dossier data/:"
ls -ld data
echo ""
echo "📄 Permissions des fichiers JSON:"
ls -l data/*.json 2>/dev/null || echo "Aucun fichier JSON trouvé"
echo ""
echo "Si vous utilisez PM2:"
echo "  pm2 restart buzzbot"
echo ""
echo "Ou si vous utilisez systemd:"
echo "  sudo systemctl restart buzzbot"
