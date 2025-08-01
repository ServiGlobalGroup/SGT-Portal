import requests

# Probar diferentes contraseñas
passwords = ["admin", "admin123", "password", "123456", "Admin123", "ADMIN", "admin123456"]

print("=== PROBANDO CONTRASEÑAS ===")

for password in passwords:
    login_data = {
        "username": "X9703580H",
        "password": password
    }
    
    response = requests.post("http://127.0.0.1:8000/api/auth/login", data=login_data)
    
    if response.status_code == 200:
        print(f"✅ ÉXITO con contraseña: '{password}'")
        token_data = response.json()
        user_info = token_data.get("user", {})
        print(f"   Usuario: {user_info.get('full_name', 'N/A')} ({user_info.get('role', 'N/A')})")
        break
    else:
        print(f"❌ Falló con contraseña: '{password}' - Status: {response.status_code}")

print("\n=== FIN DE PRUEBAS ===")
