package com.aduanas.sistema_aduanas;

import com.aduanas.sistema_aduanas.model.Usuario;
import com.aduanas.sistema_aduanas.repository.UsuarioRepository;

import java.lang.reflect.Proxy;
import java.util.Map;
import java.util.Optional;

// Ayuda para las pruebas: un UsuarioRepository falso que guarda los usuarios en un mapa
// (así las pruebas no necesitan Spring ni la base de datos). Implementa solo lo que usa la aplicación.
public final class UsuariosFalsos {

    private UsuariosFalsos() {
    }

    public static UsuarioRepository repositorio(Map<String, Usuario> tabla) {
        return (UsuarioRepository) Proxy.newProxyInstance(UsuarioRepository.class.getClassLoader(),
                new Class<?>[] { UsuarioRepository.class }, (proxy, metodo, args) -> switch (metodo.getName()) {
                    case "findByUsuario" -> Optional.ofNullable(tabla.get((String) args[0]));
                    case "save" -> {
                        Usuario u = (Usuario) args[0];
                        tabla.put(u.getUsuario(), u);
                        yield u;
                    }
                    case "count" -> (long) tabla.size();
                    case "toString" -> "RepositorioFalso";
                    case "hashCode" -> System.identityHashCode(proxy);
                    case "equals" -> proxy == args[0];
                    default -> throw new UnsupportedOperationException(metodo.getName());
                });
    }
}
