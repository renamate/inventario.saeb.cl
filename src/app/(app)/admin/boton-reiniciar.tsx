"use client";

import { useState, useTransition } from "react";
import { Loader2, RotateCcw } from "lucide-react";
import { toast } from "sonner";

import { reiniciarDemo } from "@/app/acciones";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export function BotonReiniciar() {
  const [abierto, setAbierto] = useState(false);
  const [pendiente, iniciar] = useTransition();

  return (
    <>
      <Button variant="outline" onClick={() => setAbierto(true)}>
        <RotateCcw /> Reiniciar datos de la demo
      </Button>
      <Dialog open={abierto} onOpenChange={setAbierto}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>¿Reiniciar la demo?</DialogTitle>
            <DialogDescription>
              Se borran los movimientos y solicitudes creados en la demo y se vuelve al estado del Excel (162 / 15 / 3 / 4).
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAbierto(false)}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              disabled={pendiente}
              onClick={() =>
                iniciar(async () => {
                  const r = await reiniciarDemo();
                  if (r.ok) toast.success("Demo reiniciada con los datos del Excel.");
                  else toast.error(r.error);
                  setAbierto(false);
                })
              }
            >
              {pendiente && <Loader2 className="animate-spin" />} Reiniciar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
