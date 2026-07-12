# Rollback de producción

Punto estable previo a la preparación final: commit `a5774ed80c38ec6cd903ab5f0b2d3efbc6ad2f07` del repositorio `MULTISERVICIOSSAS/PELUDITOS3D.COM`.

Respaldo local creado fuera del repositorio:

`C:\Users\santi\Documents\Codex\2026-07-09\mi\BACKUP_PELUDITOS3D_2026-07-10_0015`

## Código

1. Crear una rama desde el commit estable, sin reescribir el historial.
2. Abrir un pull request hacia `main` o hacer un avance normal de `main` si el repositorio permite cambios directos.
3. Confirmar que GitHub Pages publica la revisión restaurada.

## DNS

No es necesario modificar DNS para revertir solamente el código. Los registros de producción correctos son los cuatro `A` y cuatro `AAAA` oficiales de GitHub Pages, más `CNAME www` hacia `multiserviciossas.github.io`.

Si se retira el dominio personalizado, hacerlo primero en GitHub Pages y después ajustar DNS. No borrar registros `NS`, `SOA`, `MX` o `TXT`.
