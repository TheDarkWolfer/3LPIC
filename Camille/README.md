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

3. Copie de la clef sur les machines `travailleuses` (présumant une installation avec hyperviseur)
```bash
scp -i ~/.ssh/id_rsa root@vm-load-balancer:/etc/corosync/authkey .
scp -i ~/.ssh/id_rsa authkey web-one@vm-web-one:/tmp/
scp -i ~/.ssh/id_rsa authkey web-one@vm-web-two:/tmp/
```

4. Gestion de la clef sur les travailleuses
```bash
sudo mv /tmp/authkey /etc/corosync/authkey
sudo chown root:root /etc/corosync/authkey
sudo chmod 400 /etc/corosync/authkey
```
5. `/etc/corosync/corosync.conf` sur les trois machines
```conf
# Caractéristiques du cluster
totem {
    version: 2
    cluster_name: coursero
transport: udpu
    interface {
        ringnumber: 0
        
        # Adresse basée sur les subnets générés par Libvirt/Qemu ; à ajuster lors du déploiement réel
        bindnetaddr: 192.168.122.0
        mcastport: 5405
    }
}

nodelist {
    # Noeud de l'équilibreur de charges (c'est pas un ELB mais ça fonctionne ^^)
    node {
        ring0_addr: 192.168.122.28
        name: load-balancer
        nodeid: 1
    }
    
    # Première instance de site web
    node {
        ring0_addr: 192.168.122.111
        name: web-one
        nodeid: 2
    }
    node {
        ring0_addr: 192.168.122.76
        name: web-two
        nodeid: 3
    }
}

# On log tout ça dans les fichiers système
logging {
    to_logfile: yes
    logfile: /var/log/corosync/corosync.log
    to_syslog: yes
}

# Faut un bloc pour le quorum, sinon corosync s'énèrve -_-
quorum {
    provider: corosync_votequorum
}


```
>[!NOTE] On applique la configuration avec `sudo systemctl restart corosync` ; si besoin est, on l'active au démarrage avec `sudo systemctl enable --now corosync`

6. Activation de pacemaker
```bash
sudo systemctl enable --now pacemaker

# Vérification
sudo crm status
```
Exemple de résultat de la commande `crm status` :
```bash
Cluster Summary:
  * Stack: corosync (Pacemaker is running)
  * Current DC: web-two (version 3.0.0-3.0.0) - partition with quorum
  * Last updated: Fri Mar 20 23:16:58 2026 on maestro
  * Last change:  Fri Mar 20 23:16:24 2026 by root via root on maestro
  * 3 nodes configured
  * 0 resource instances configured

Node List:
  * Online: [ maestro web-one web-two ]

Full List of Resources:
  * No resources
```

7. Désactivation de la politique "*S*hoot *T*he *O*ther *N*ode *I*n *T*he *H*ead" 
>[!IMPORTANT]
> inutile dans un cluster aussi petit, avec un quorum décisionnel impair
> À lancer sur la machine décisionnelle (ici `maestro`)
```bash
sudo crm configure property stonith-enabled=false
```

8. Paramétrage d'une plage d'IPs virtuelles
>[!IMPORTANT]
> Permet aux machines de travailler même sans le maestro, au cas où ce dernier 
> viendrait à manquer à l'appel
```bash
sudo crm configure primitive virtual-ip ocf:heartbeat:IPaddr2 \
    params ip="192.168.122.100" \
    cidr_netmask="24" \
    op monitor interval="30s"
```

## Gestion des machines travailleuses avec Puppet
1. Installer le serveur Puppet sur `load-balancer`
```bash
sudo apt install puppetserver
```
