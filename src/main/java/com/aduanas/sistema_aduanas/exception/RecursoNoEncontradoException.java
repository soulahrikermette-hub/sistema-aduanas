package com.aduanas.sistema_aduanas.exception;

// Se lanza cuando se pide una declaración o mercancía que no existe.
// El GlobalExceptionHandler la convierte en una respuesta HTTP 404.
public class RecursoNoEncontradoException extends RuntimeException {

    private static final long serialVersionUID = 1L;

    public RecursoNoEncontradoException(String mensaje) {
        super(mensaje);
    }
}
