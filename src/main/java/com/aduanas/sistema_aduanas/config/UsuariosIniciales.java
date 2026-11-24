package com.aduanas.sistema_aduanas.config;

import com.aduanas.sistema_aduanas.model.Usuario;
import com.aduanas.sistema_aduanas.repository.UsuarioRepository;
import com.aduanas.sistema_aduanas.service.AuthService;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

// Crea las dos cuentas iniciales (admin y funcionario) la primera vez que arranca la aplicación,
// si todavía no existen en la tabla "usuarios". Sus contraseñas salen de application.properties
// y se guardan ya con hash. Después de la primera vez, cambiar la propiedad NO cambia la
// contraseña que ya está en la base de datos.
@Component
public class UsuariosIniciales implements CommandLineRunner {

    private final UsuarioRepository usuarios;
    private final String claveAdmin;
    private final String claveFuncionario;

    public UsuariosIniciales(UsuarioRepository usuarios,
                             @Value("${aduanas.auth.admin-clave:Admin2026*}") String claveAdmin,
                             @Value("${aduanas.auth.funcionario-clave:Func2026*}") String claveFuncionario) {
        this.usuarios = usuarios;
        this.claveAdmin = claveAdmin;
        this.claveFuncionario = claveFuncionario;
    }

    @Override
    public void run(String... args) {
        crearSiNoExiste("admin", "Administrador", AuthService.ROL_ADMIN, claveAdmin);
        crearSiNoExiste("funcionario", "Funcionario de aduanas", AuthService.ROL_FUNCIONARIO, claveFuncionario);
    }

    private void crearSiNoExiste(String usuario, String nombre, String rol, String clave) {
        if (usuarios.findByUsuario(usuario).isEmpty()) {
            usuarios.save(new Usuario(usuario, nombre, rol, AuthService.hashear(clave)));
        }
    }
}
