package com.aduanas.sistema_aduanas.exception;

import com.aduanas.sistema_aduanas.model.ErrorRespuesta;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;

import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.Map;

// Atrapa las excepciones de TODOS los controladores y las convierte en respuestas
// JSON con la misma forma (ErrorRespuesta). Así la página muestra mensajes claros
// en vez de la "Whitelabel Error Page" o un 400 con un texto técnico.
@RestControllerAdvice
public class GlobalExceptionHandler {

    // 400: falló alguna validación (@NotBlank, @Pattern, @Positive...) del JSON recibido
    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ErrorRespuesta> datosInvalidos(MethodArgumentNotValidException ex) {
        Map<String, String> campos = new LinkedHashMap<>();
        // Guardamos el primer mensaje de cada campo (un campo puede fallar en varias reglas)
        ex.getBindingResult().getFieldErrors()
                .forEach(error -> campos.putIfAbsent(error.getField(), error.getDefaultMessage()));
        return responder(HttpStatus.BAD_REQUEST, "Solicitud inválida", "Hay datos que corregir.", campos);
    }

    // 400: el cuerpo no es un JSON válido o un valor tiene el tipo equivocado (ej: texto donde va un número)
    @ExceptionHandler(HttpMessageNotReadableException.class)
    public ResponseEntity<ErrorRespuesta> jsonIlegible(HttpMessageNotReadableException ex) {
        return responder(HttpStatus.BAD_REQUEST, "Solicitud inválida",
                "El cuerpo de la petición no es un JSON válido o algún valor tiene un formato incorrecto.",
                new LinkedHashMap<>());
    }

    // 400: un parámetro de la URL tiene formato incorrecto (ej: /api/declaraciones/abc)
    @ExceptionHandler(MethodArgumentTypeMismatchException.class)
    public ResponseEntity<ErrorRespuesta> parametroIncorrecto(MethodArgumentTypeMismatchException ex) {
        return responder(HttpStatus.BAD_REQUEST, "Solicitud inválida",
                "El parámetro '" + ex.getName() + "' tiene un formato incorrecto.",
                new LinkedHashMap<>());
    }

    // 400: la petición no cumple una regla del negocio (ej: la declaración indicada no existe)
    @ExceptionHandler(SolicitudInvalidaException.class)
    public ResponseEntity<ErrorRespuesta> solicitudInvalida(SolicitudInvalidaException ex) {
        Map<String, String> campos = new LinkedHashMap<>();
        campos.put(ex.getCampo(), ex.getMessage());
        return responder(HttpStatus.BAD_REQUEST, "Solicitud inválida", ex.getMessage(), campos);
    }

    // 404: la declaración o mercancía pedida no existe
    @ExceptionHandler(RecursoNoEncontradoException.class)
    public ResponseEntity<ErrorRespuesta> noEncontrado(RecursoNoEncontradoException ex) {
        return responder(HttpStatus.NOT_FOUND, "No encontrado", ex.getMessage(), new LinkedHashMap<>());
    }

    // 409: choca con algo que ya existe (ej: número de declaración repetido)
    @ExceptionHandler(ConflictoException.class)
    public ResponseEntity<ErrorRespuesta> conflicto(ConflictoException ex) {
        Map<String, String> campos = new LinkedHashMap<>();
        campos.put(ex.getCampo(), ex.getMessage());
        return responder(HttpStatus.CONFLICT, "Conflicto", ex.getMessage(), campos);
    }

    // 401 (usuario o contraseña incorrectos) o 429 (cuenta bloqueada un minuto por demasiados intentos)
    @ExceptionHandler(CredencialesInvalidasException.class)
    public ResponseEntity<ErrorRespuesta> credenciales(CredencialesInvalidasException ex) {
        if (ex.isBloqueado()) {
            return responder(HttpStatus.TOO_MANY_REQUESTS, "Demasiados intentos", ex.getMessage(), new LinkedHashMap<>());
        }
        return responder(HttpStatus.UNAUTHORIZED, "No autorizado", ex.getMessage(), new LinkedHashMap<>());
    }

    // Arma la respuesta con la forma estándar de error
    private ResponseEntity<ErrorRespuesta> responder(HttpStatus estado, String error, String mensaje,
                                                     Map<String, String> campos) {
        ErrorRespuesta cuerpo = new ErrorRespuesta(estado.value(), error, mensaje, campos, Instant.now().toString());
        return ResponseEntity.status(estado).body(cuerpo);
    }
}
