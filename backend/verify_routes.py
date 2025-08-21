#!/usr/bin/env python3
"""
Script para verificar que todas las rutas se registren correctamente
"""

import sys
import os

# Asegurar que podemos importar los modelos
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

try:
    from main import app
    
    print("✅ Aplicación FastAPI importada correctamente")
    print("\n📋 Rutas registradas:")
    
    for route in app.routes:
        if hasattr(route, 'methods') and hasattr(route, 'path'):
            methods = ', '.join(sorted(route.methods)) if route.methods else 'N/A'
            print(f"  {methods:<15} {route.path}")
    
    print(f"\n🎯 Total de rutas: {len(app.routes)}")
    
    # Buscar específicamente rutas de vacaciones
    vacation_routes = [route for route in app.routes if '/vacations' in str(route.path)]
    print(f"\n🏖️ Rutas de vacaciones encontradas: {len(vacation_routes)}")
    for route in vacation_routes:
        methods = ', '.join(sorted(route.methods)) if hasattr(route, 'methods') and route.methods else 'N/A'
        print(f"  {methods:<15} {route.path}")
    
except Exception as e:
    print(f"❌ Error: {e}")
    import traceback
    traceback.print_exc()
