"use client";

import { useEffect, useRef, useState } from "react";
import { CameraOff, Keyboard, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

type Props = {
  abierto: boolean;
  onAbiertoChange: (abierto: boolean) => void;
  onCodigo: (codigo: string) => void;
};

/** Lee QR y códigos de barra (EAN, Code 128, etc.) con la cámara trasera del teléfono. */
export function Escaner({ abierto, onAbiertoChange, onCodigo }: Props) {
  const [manual, setManual] = useState("");
  return (
    <Dialog open={abierto} onOpenChange={onAbiertoChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Escanear etiqueta</DialogTitle>
          <DialogDescription>Apunta a la etiqueta QR del producto o a un código de barra.</DialogDescription>
        </DialogHeader>
        <VistaCamara onCodigo={onCodigo} />
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (manual.trim()) onCodigo(manual.trim());
          }}
        >
          <div className="relative flex-1">
            <Keyboard className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={manual}
              onChange={(e) => setManual(e.target.value)}
              placeholder="O escribe SKU / código"
              className="h-11 pl-9"
              inputMode="numeric"
            />
          </div>
          <Button type="submit" variant="secondary" className="h-11">
            Usar
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function VistaCamara({ onCodigo }: { onCodigo: (codigo: string) => void }) {
  const video = useRef<HTMLVideoElement>(null);
  const [estado, setEstado] = useState<"iniciando" | "leyendo" | "error">("iniciando");
  const [mensajeError, setMensajeError] = useState("");
  const onCodigoRef = useRef(onCodigo);
  useEffect(() => {
    onCodigoRef.current = onCodigo;
  });

  useEffect(() => {
    let cancelado = false;
    let detener: (() => void) | undefined;

    (async () => {
      try {
        if (!navigator.mediaDevices?.getUserMedia) {
          throw new Error("Este navegador no permite usar la cámara (se requiere HTTPS).");
        }
        const { BrowserMultiFormatReader } = await import("@zxing/browser");
        const lector = new BrowserMultiFormatReader();
        if (cancelado || !video.current) return;
        const controles = await lector.decodeFromConstraints(
          { video: { facingMode: { ideal: "environment" } }, audio: false },
          video.current,
          (resultado, _error, ctrl) => {
            if (resultado) {
              ctrl.stop();
              if ("vibrate" in navigator) navigator.vibrate?.(60);
              onCodigoRef.current(resultado.getText());
            }
          },
        );
        if (cancelado) controles.stop();
        else {
          detener = () => controles.stop();
          setEstado("leyendo");
        }
      } catch (e) {
        if (cancelado) return;
        const nombre = e instanceof Error ? e.name : "";
        setMensajeError(
          nombre === "NotAllowedError"
            ? "No diste permiso para usar la cámara. Actívalo en el navegador o escribe el código."
            : nombre === "NotFoundError"
              ? "No se encontró una cámara en este dispositivo."
              : e instanceof Error
                ? e.message
                : "No se pudo iniciar la cámara.",
        );
        setEstado("error");
      }
    })();

    return () => {
      cancelado = true;
      detener?.();
    };
  }, []);

  return (
    <div className="relative aspect-square w-full overflow-hidden rounded-xl bg-black">
      <video ref={video} className="size-full object-cover" muted playsInline />
      {estado === "leyendo" && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="size-3/5 rounded-2xl border-4 border-white/80 shadow-[0_0_0_9999px_rgba(0,0,0,0.35)]" />
        </div>
      )}
      {estado === "iniciando" && (
        <div className="absolute inset-0 flex items-center justify-center text-white">
          <Loader2 className="size-6 animate-spin" />
        </div>
      )}
      {estado === "error" && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 p-6 text-center text-sm text-white">
          <CameraOff className="size-8" />
          {mensajeError}
        </div>
      )}
    </div>
  );
}
