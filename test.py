import nmap
import json

target = "127.0.0.1"
ports = "1-20"

def PortScan(target, ports):
    scanner = nmap.PortScanner()
    print(f"Scanning {target} on ports {ports}...")
    scanner.scan(target, ports, arguments='-sV')

    output = {
        "target": target,
        "ports_range": ports,
        "hosts": []
    }

    for host in scanner.all_hosts():
        host_info = {
            "host": host,
            "hostname": scanner[host].hostname(),
            "state": scanner[host].state(),
            "protocols": []
        }

        for proto in scanner[host].all_protocols():
            proto_info = {
                "protocol": proto,
                "ports": []
            }

            for port in sorted(scanner[host][proto].keys()):
                port_data = scanner[host][proto][port]

                proto_info["ports"].append({
                    "port": port,
                    "state": port_data.get("state"),
                    "name": port_data.get("name"),
                    "product": port_data.get("product"),
                    "version": port_data.get("version"),
                })

            host_info["protocols"].append(proto_info)

        output["hosts"].append(host_info)

    return json.dumps(output, indent=4)

print(PortScan(target, ports))