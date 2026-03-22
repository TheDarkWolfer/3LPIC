# 3LPIC

## Dev note
>[!NOTE]DB
> Les bases de données MongoDB utilisent le port `27017`

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

## Site web Coursero
Apache s'attend à ce que les fichiers du site web soient dans `/var/www/www.coursero.com`. Ce faisant, il vous faudra suivre les étapes ci-dessous :
1. Cloner le dépôt `git`
```bash
git clone https://github.com/TheDarkWolfer/3LPIC
```

2. Build le projet
```bash
cd ./3LPIC/website
npm install
npm run build
```

3. Déplacer les fichiers statiques
```bash
mv ./build/ /var/www/www.coursero.com/
```

## HTTPS

### Certificat TLS
Pour que les données transmises sur le site soient sécurisées, nous devons créer un certificat SSL/TLS. Pour un environnement de test, on peut utiliser OpenSSL et créer des certificats autosignés ; pour un environnement de déploiement réel, nous pourrons utiliser certbot et letsencrypt.

#### Old Reliable : Méthode OpenSSL
1. Installation
```bash
sudo apt update 
sudo apt install openssl -y
```

2. Génération d'une clef privée, ici RSA de 2048 bits, et création d'un certificat avec la clef associée
>[!INFO]
> La création du certificat nécessite de répondre à quelques questions sur les différents détails attachés
> au certificat.
```bash
sudo openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
      -keyout /etc/ssl/private/coursero.key \
      -out /etc/ssl/certs/coursero.crt
```

3. Vérification du certificat
```bash
openssl x509 -in /etc/ssl/certs/coursero.crt -text -noout
```

4. Permissions des fichiers
```bash
sudo chmod 600 /etc/ssl/private/coursero.key
sudo chmod 644 /etc/ssl/certs/coursero.cert
```

### Configuration Apache2
```conf
# Redirection automatique si quelqu'un se connecte en HTTP
# Bon vieux p'tit https://http.cat/status/308
<VirtualHost *:80>
      ServerName www.coursero.com
      Redirect permanent / https://www.coursero.com/
</VirtualHost>

<VirtualHost *:443>

      # Informations basiques du site web (fausse adresse mail bien sûr) 
      ServerName www.coursero.com
      ServerAdmin camille@coursero.com

      # [!] À modifier pour être en accord avec le site créé par Dimitri
      DocumentRoot /var/www/www.coursero.com

      ErrorLog /var/log/apache2/www.coursero.com/error.log
      CustomLog /var/log/apache2/www.coursero.com/access.log combined
      LogLevel warn
      
      # Faut tout ça pour avoir une connection HTTPS
      SSLEngine on
      SSLCertificateFile      /etc/ssl/certs/coursero.crt
      SSLCertificateKeyFile   /etc/ssl/private/coursero.key
</VirtualHost>
```

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
sudo crm status # Élévation de privilèges nécessaire

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

9. Paramétrage d'une ressource Apache qu'on va affecter aux VMs 
>[!INFO]
> Le paramètre "configfile" permet de savoir où se trouve le fichier de config Apache
```bash
crm configure primitive apache-web 
      ocf:heartbeat:apache \
      params configfile="/etc/apache2/sites-available/www.coursero.fr.conf" \
      op monitor interval="30s"
```

## Gestion des machines travailleuses avec Puppet
1. Installer le serveur Puppet sur `load-balancer`
```bash
sudo apt install puppetserver
```

2. Modifier la configuration du serveur
```bash
sudo mkdir -p /etc/puppetlabs/puppetserver/
sudo nano /etc/puppetlabs/puppetserver/puppetserver.conf
```

```conf
[main]
certname = maestro
server = maestro
environment = production

[server]
vardir = /opt/puppetlabs/server/data/puppetserver
logdir = /var/log/puppetlabs/puppetserver
rundir = /var/run/puppetlabs/puppetserver
pidfile = /var/run/puppetlabs/puppetserver/puppetserver.pid
codedir = /etc/puppetlabs/code
```

3. Configuration d'un manifeste de site
>[!INFO] 
> Le manifest s'occupe de l'installation des paquets et de la distribution des configurations
> de manière adaptée. Cet outil a été choisi pour éviter la réécriture constante des configurations
> et des commandes d'installation sur chaque VM : en bref, meilleure scalabilité que Ctrl+C/Ctrl+V
```puppet
# Gestion des deux noeuds webservers
node 'web-one', 'web-two' {
    # Apache + SSL
    package { 'apache2':
      ensure => installed,
    }

    service { 'apache2':
      ensure => running,
      enable => true,
      require => Package['apache2'],
    }

    # Activation du module SSL/TLS
    exec { 'enable-ssl':
      command => '/usr/sbin/a2enmod ssl',
      creates => '/etc/apache2/mods-enabled/ssl.load',
      notify  => Service['apache2'],
    }

    # Configuration de l'hôte virtuel SSL
    file { '/etc/apache2/sites-available/ssl.conf':
      ensure  => file,
      content => template('apache_ssl/ssl.conf.erb'),
      notify  => Service['apache2'],
      require => Exec['generate-ssl-cert'],
    }

    exec { 'enable-ssl-site':
      command => '/usr/sbin/a2ensite ssl',
      creates => '/etc/apache2/sites-enabled/ssl.conf',
      notify  => Service['apache2'],
      require => File['/etc/apache2/sites-available/ssl.conf'],
    }

    # Installation de mongodb - basé sur https://www.mongodb.com/docs/v8.0/tutorial/install-mongodb-on-debian/, car manquant des dépôts APT ᵕ—ᴗ—
    exec { 'mongodb-gpg-key':
      command => '/usr/bin/curl -fsSL https://www.mongodb.org/static/pgp/server-7.0.asc | /usr/bin/gpg --dearmor -o /usr/share/keyrings/mongodb-server-7.0.gpg',
      creates => '/usr/share/keyrings/mongodb-server-7.0.gpg',
    }

    # Ajout de MongoDB dans la liste de dépôts ; permet la mise à jour automatique avec APT
    file { '/etc/apt/sources.list.d/mongodb-org-7.0.list':
      ensure  => file,
      content => "deb [signed-by=/usr/share/keyrings/mongodb-server-7.0.gpg] http://repo.mongodb.org/apt/debian bookworm/mongodb-org/7.0 main\n",
      require => Exec['mongodb-gpg-key'],
      notify  => Exec['apt-update-mongo'],
    }

    # Mise à jour de la liste de paquets ; nécessaire pour l'installation et la mise à jour
    exec { 'apt-update-mongo':
      command     => '/usr/bin/apt-get update',
      refreshonly => true,
    }

    # Installation MongoDB
    package { 'mongodb-org':
      ensure  => installed,
      require => Exec['apt-update-mongo'],
    }

    # Création de la config sur les deux instances
    file { '/etc/mongod.conf':
      ensure  => file,
      content => @("CONF"),
        storage:
          dbPath: /var/lib/mongodb

        systemLog:
          destination: file
          path: /var/log/mongodb/mongod.log
          logAppend: true

        net:
          port: 27017
          bindIp: 0.0.0.0

        replication:
          replSetName: "rs-coursero"
        | CONF
      require => Package['mongodb-org'],
      notify  => Service['mongod'],
    }

    # Démarrer les instances
    service { 'mongod':
      ensure  => running,
      enable  => true,
      require => Package['mongodb-org'],
    }

}

node 'maestro' {
    # Maestro est grand, il se gère tout seul
}
```
