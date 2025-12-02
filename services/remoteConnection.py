import paramiko


def sshConnect(ip,user,passwd,port):
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    try:
        ssh.connect(
        hostname=ip,
        username=user,
        password=passwd,
        port=port
        )
        return ssh
    except:
        return "SSH connection problem"
    
def getOsVersion(ip, user, passwd, port):
    ssh = sshConnect(ip, user, passwd, port)
    if ssh is None:
        return None

    stdin, stdout, stderr = ssh.exec_command("cat /etc/os-release | grep -i ^id=")
    output = stdout.read().decode().strip().lower()

    if "=" in output:
        output = output.split("=")[1].replace('"','').strip()

    return output
