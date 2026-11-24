package com.aduanas.sistema_aduanas.exception;

// Se lanza cuando el JSON es válido pero no tiene sentido para el negocio
// (por ejemplo, una mercancía que apunta a una declaración que no existe).
// El GlobalExceptionHandler la convierte en una respuesta HTTP 400.
public class SolicitudInvalidaException extends RuntimeException {

    private static final long serialVersionUID = 1L;

    // Campo del formulario al que corresponde el problema (para marcarlo en la página)
    private final String campo;

    public SolicitudInvalidaException(String campo, String mensaje) {
        super(mensaje);
        this.campo = campo;
    }

    public String getCampo() {
        return campo;
    }
}
