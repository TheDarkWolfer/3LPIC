#!/bin/bash

  # Small script to re-template a VM so that we don't have seventy VMs that 
  # share the same hostname & stuff, just need one SSH login and to run this
  # script and fill in the prompts

# Check if script is run as root
if [ "$(id -u)" -ne 0 ]; then
    echo "This script must be run as root. Use 'sudo'." >&2
    exit 1
fi

ssh_key="ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAACAQDLslsfgSECmxtJlpOf/wuFpO+pR3OaVh1sNhD4kQPOPWQMQYBcg/vx0c6dhsCVQXQTiycaZWCUhEjyH0JHwglbjbe+t4WbPdc6z+IArqVnMtUzueNK6pYiGiorEcL2EoUc2ac3jRWOat/JnT+H1k0UOT/h6Mon3PStzvjVg3NhO1mRyBeLFcNXHHzncgI0LdsNm3JYDLXjoJXyBrVIGRdqJzpysTHxwvQyox7oLClM12OjX/4KBB7QDN0w1zUZ/FSvQ3r8hRaoeOP95/Si7IBRmvXK+mgWUE8XPFs9x8BM5SEAO8z7qdJpExDPyGoUeTG7QkzbaD7a4v6cNOHEWomYgJFPoeT0PsrXjY5jBhxGnHyOGFZWFMMhAEZsYda7pldLyFA2zkFNta/zNmn3vgqT/O+qQeb+Lr6kR71H6AXmQOubEHzcx0+3uYgjWJOKG6efPAkhPwMBgMfaJBcHPnQCyW/8X4aQps2oB2FJ9bjFghD5BnnYG1Ib7haBUfxjIYRlZyeuNDTd6ZsVzz/TLbZq2eYtj3ABBjuPu1w/mWwEPDcx861+GxpEuEszpy5S49/PCnfDujrQnK0rv+WmIrTDW+Sr2pZEUxsICAGZvBbpX8tdx6YZ8PGuRkKF07BERn+4lr7Hb4JCeNcdsfhnrxEXm/w6/ujoq6i4QjosjvG/3Q== camille@Lycoris"

# Prompt for new username
read -p "Enter the new username: " username

# Create the user and add to sudo group
/sbin/useradd -m -s /bin/bash "$username"
/sbin/usermod -aG sudo "$username"
echo "User $username created and added to sudo group."

# Set a password for the new user
passwd "$username"

# Prompt for new hostname
read -p "Enter the new hostname: " new_hostname

# Change the hostname
hostnamectl set-hostname "$new_hostname"
echo "Hostname changed to $new_hostname."

# Update /etc/hosts
sed -i "s/127.0.1.1.*/127.0.1.1\t$new_hostname/" /etc/hosts
echo "/etc/hosts updated."

echo "Setup complete. You may need to log out and back in for changes to take full effect."

# Set ssh key & ownership to make it easier lol
echo "$ssh_key" >> "/home/$username/.ssh/authorized_keys"
chown "$username":"$username" -R "/home/$username/.ssh/authorized_keys"

# Make it so that I see the device's IP whenever applicable
echo "ip a" >> "/home/$username/.bashrc"

# Delete the default debian-1 user if it exists
# Often useless to check, but just in case
if id "debian-1" &>/dev/null; then
    userdel -r debian-1
    echo "User debian-1 has been deleted."
else
    echo "User debian-1 does not exist, skipping."
fi

# Reboot the VM I guess ╮.❛ᴗ❛.╭
reboot
