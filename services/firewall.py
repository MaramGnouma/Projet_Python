from remoteConnection import getOsVersion,sshConnect
import paramiko 
import json
ip="172.20.10.5"
user="kali"
passwd="kali"
port=22
OsVersion=getOsVersion(ip,user,passwd,port)
ssh = sshConnect(ip,user,passwd,port)

def openPort(ssh, osVersion, allow_port, protocol):
    if ssh is None or osVersion is None:
        return "SSH or OS problem"

    osVersion = osVersion.lower()

    try:
        if osVersion in ["kali", "ubuntu", "linuxmint", "debian"]:
            ssh.exec_command(f"sudo ufw allow {allow_port}/{protocol}")
            return "Port opened with UFW"

        return "OS not supported"

    except Exception as e:
        return f"Error opening port: {e}"
     
        
        
result = openPort(ssh, OsVersion, 80, "tcp")
print(result)
