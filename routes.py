from services.scannerPort import *
from flask import Flask, render_template, jsonify, request,Blueprint
api_bp = Blueprint('api', __name__)


@api_bp.route('/scanPort', methods=['POST'])
def start_scan():
    """API pour démarrer un scan de ports"""
    data = request.json
    target = data.get('target', '127.0.0.1')
    port_start = data.get('port_start', '1')
    port_end = data.get('port_end', '1000')
    scan_type = data.get('scan_type', 'tcp')
    mode = data.get('mode', 'complete')
    
    result, status_code = start_scan_service(target, port_start, port_end, scan_type, mode)
    return jsonify(result), status_code


@api_bp.route('/scan-status', methods=['GET'])
def get_scan_status():
    """API pour récupérer l'état du scan en cours"""
    status = get_scan_status_service()
    return jsonify(status)


@api_bp.route('/stop-scan', methods=['POST'])
def stop_scan():
    """API pour arrêter le scan en cours"""
    result = stop_scan_service()
    return jsonify(result)
