from typing import Optional
from app.models.company_enum import Company


def normalize_company(value: Optional[str]) -> Optional[Company]:
    if not value:
        return None
    v = value.strip().upper()
    if v in ("SERVIGLOBAL", "EMATRA"):
        try:
            return Company[v]
        except Exception:
            # Por compatibilidad si el Enum usa valores y no nombres
            return Company.SERVIGLOBAL if v == "SERVIGLOBAL" else Company.EMATRA
    return None


def effective_company_for_request(current_user, x_company: Optional[str]) -> Optional[Company]:
    """
    Determina la empresa efectiva a usar en la petición.
    - Si el usuario es ADMINISTRADOR o MASTER_ADMIN y se envía cabecera X-Company válida, se usa esa.
    - En caso contrario, se usa la empresa del usuario (si la tiene).
    """
    # Obtener rol como string seguro
    role_value = getattr(getattr(current_user, 'role', None), 'value', str(getattr(current_user, 'role', '')))
    # Normalizar cabecera
    header_company = normalize_company(x_company)
    if role_value in ("ADMINISTRADOR", "MASTER_ADMIN", "ADMINISTRACION") and header_company is not None:
        return header_company
    # Fallback a la empresa del usuario
    comp = getattr(current_user, 'company', None)
    # comp puede ser Enum o string; intentar normalizar a Enum
    if isinstance(comp, Company):
        return comp
    if isinstance(comp, str):
        return normalize_company(comp)
    return None
