-- Script para agregar P_TALLER al enum userrole
ALTER TYPE userrole ADD VALUE IF NOT EXISTS 'P_TALLER';