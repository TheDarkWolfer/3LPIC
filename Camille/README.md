# 3LPIC

## Scripts 
`redoing.sh`
Ce script sert à mettre en place une VM après qu'elle aie été clonée.

## Tests automatisés
1. Installation de Firejail ;
```bash
sudo apt update
sudo apt install firejail

# vérification qu'on a bien installé firejail
firejail --version
```

2. 


## HTTPS


## Load balancing avec Pacemaker
1. Installation de pacemaker (toutes les machines)
```bash
sudo apt update
sudo apt install pacemaker corosync pcs crmsh apache2
```

2. Configuration de corosync sur le *load balancer*
```bash
sudo corosync-keygen
```
