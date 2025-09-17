import enum


class Company(enum.Enum):
    """Enum de empresa para etiquetar registros por compañía.

    Valores permitidos:
    - SERVIGLOBAL
    - EMATRA
    """
    SERVIGLOBAL = "SERVIGLOBAL"
    EMATRA = "EMATRA"
