package com.aduanas.sistema_aduanas.exception;

// Se lanza cuando la operación choca con datos que ya existen
// (por ejemplo, un número de declaración repetido).
// El GlobalExceptionHandler la convierte en una respuesta HTTP 409.
public class ConflictoException extends RuntimeException {

    private static final long serialVersionUID = 1L;

    // Campo del formulario al que corresponde el conflicto (para marcarlo en la página)
    private final String campo;

    public ConflictoException(String campo, String mensaje) {
        super(mensaje);
        this.campo = campo;
    }

    public String getCampo() {
        return campo;
    }
}
