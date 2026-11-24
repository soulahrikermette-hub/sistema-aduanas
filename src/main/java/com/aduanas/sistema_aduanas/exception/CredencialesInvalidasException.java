package com.aduanas.sistema_aduanas.exception;

// Se lanza cuando el usuario o la contraseña no son correctos, o cuando la cuenta
// está bloqueada temporalmente por demasiados intentos fallidos.
// El GlobalExceptionHandler la convierte en HTTP 401 (o 429 si hay bloqueo).
public class CredencialesInvalidasException extends RuntimeException {

    private static final long serialVersionUID = 1L;

    // true cuando el motivo es el bloqueo temporal y no una contraseña equivocada
    private final boolean bloqueado;

    public CredencialesInvalidasException(String mensaje, boolean bloqueado) {
        super(mensaje);
        this.bloqueado = bloqueado;
    }

    public boolean isBloqueado() {
        return bloqueado;
    }
}
