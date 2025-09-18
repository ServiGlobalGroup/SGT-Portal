#!/usr/bin/env python3
"""
Script para probar la creación de un usuario con rol P_TALLER
"""
import requests
import json

# Configuración
BASE_URL = "http://localhost:8010"
LOGIN_DATA = {
    "username": "X9703580H",  # Usuario administrador actual
    "password": "1234",
    "company": "EMATRA"
}

def test_p_taller_role():
    """Prueba la creación de un usuario con rol P_TALLER"""
    
    # 1. Hacer login
    print("1. Haciendo login...")
    login_response = requests.post(f"{BASE_URL}/api/auth/login", json=LOGIN_DATA)
    
    if login_response.status_code != 200:
        print(f"Error en login: {login_response.status_code}")
        print(login_response.text)
        return False
    
    token = login_response.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    print("✅ Login exitoso")
    
    # 2. Intentar crear usuario con rol P_TALLER
    print("2. Creando usuario de prueba con rol P_TALLER...")
    user_data = {
        "dni_nie": "TEST_PTALLER_001",
        "first_name": "Test",
        "last_name": "P.Taller",
        "email": "test.ptaller@ematra.com",
        "role": "P_TALLER",
        "department": "TALLER",
        "position": "Mecánico",
        "worker_type": "nuevo",
        "password": "test123"
    }
    
    create_response = requests.post(
        f"{BASE_URL}/api/users", 
        json=user_data, 
        headers=headers,
        params={"company": "EMATRA"}
    )
    
    if create_response.status_code == 201:
        print("✅ Usuario P_TALLER creado exitosamente!")
        print(f"Respuesta: {create_response.json()}")
        return True
    else:
        print(f"❌ Error creando usuario P_TALLER: {create_response.status_code}")
        print(f"Detalle: {create_response.text}")
        return False

if __name__ == "__main__":
    print("=== Prueba del rol P_TALLER ===")
    success = test_p_taller_role()
    if success:
        print("\n🎉 ¡El rol P_TALLER funciona correctamente!")
    else:
        print("\n❌ Hay problemas con el rol P_TALLER")