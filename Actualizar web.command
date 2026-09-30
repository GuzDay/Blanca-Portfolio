#!/bin/bash
# Doble clic aquí para pasar la carpeta de fotos de Blanca a la web y publicarla.
cd "$(dirname "$0")" || exit 1
clear
echo "Actualizando la web de Blanca..."
echo
npm run --silent actualizar
estado=$?
echo
if [ $estado -ne 0 ]; then
  echo "Algo ha fallado. Copia lo de arriba y pásaselo a Guzmán."
fi
echo "Pulsa cualquier tecla para cerrar esta ventana."
read -n 1 -s
