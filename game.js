import * as THREE from 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.module.js';
import { PointerLockControls } from 'https://cdn.jsdelivr.net/npm/three@0.128.0/examples/jsm/controls/PointerLockControls.js';
import { GLTFLoader } from 'https://cdn.jsdelivr.net/npm/three@0.128.0/examples/jsm/loaders/GLTFLoader.js';

class JuegoDeTerror {
    constructor() {
        this.escena = new THREE.Scene();
        this.camara = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.renderizador = new THREE.WebGLRenderer({ 
            antialias: true,
            alpha: true 
        });
        
        // Renderizado mejorado
        this.renderizador.shadowMap.enabled = true;
        this.renderizador.shadowMap.type = THREE.PCFSoftShadowMap;
        
        this.renderizador.setSize(window.innerWidth, window.innerHeight);
        document.getElementById('game-container').appendChild(this.renderizador.domElement);

        // Parámetros de movimiento más realistas
        this.moverAdelante = false;
        this.moverAtras = false;
        this.moverIzquierda = false;
        this.moverDerecha = false;
        this.velocidad = new THREE.Vector3();
        this.direccion = new THREE.Vector3();
        this.velocidadNormal = 0.05;
        this.velocidadSprint = 0.1;  

        // Límites de altura más precisos
        this.alturaMinima = 1.6;  
        this.alturaMaxima = 2;   

        // Mecánicas mejoradas de linterna
        this.linternaActivada = false;
        this.bateriaDeLinterna = 100;
        this.velocidadDescargaBateria = 0.08;
        this.velocidadRecargaBateria = 0.04;

        // Modelo de personaje avanzado
        this.modeloPersonaje = null;
        
        this.sprintActivado = false;

        this.configurarControles();
        this.configurarControlesTeclado();
        this.crearAmbienteRealista();
        this.configurarLinternaAvanzada();
        this.agregarMonstruosRealistas();
        this.crearModeloPersonaje();
        
        this.camara.position.set(0, 2, 5);
        
        // Añadir manejador de redimensionamiento de ventana
        window.addEventListener('resize', this.alRedimensionarVentana.bind(this));
        
        this.animar();
    }

    alRedimensionarVentana() {
        this.camara.aspect = window.innerWidth / window.innerHeight;
        this.camara.updateProjectionMatrix();
        this.renderizador.setSize(window.innerWidth, window.innerHeight);
    }

    configurarControles() {
        this.controles = new PointerLockControls(this.camara, document.body);
        
        document.addEventListener('click', () => {
            this.controles.lock();
            document.getElementById('interaction-prompt').style.display = 'none';
        });
    }

    configurarControlesTeclado() {
        document.addEventListener('keydown', (event) => {
            switch (event.code) {
                case 'KeyW':
                    this.moverAdelante = true;
                    break;
                case 'KeyS':
                    this.moverAtras = true;
                    break;
                case 'KeyA':
                    this.moverIzquierda = true;
                    break;
                case 'KeyD':
                    this.moverDerecha = true;
                    break;
                case 'KeyF':
                    this.alternarLinterna();
                    break;
                case 'KeyT':
                    this.alternarVistaTerceraPersona();
                    break;
                case 'ShiftLeft':  
                case 'ShiftRight':
                    this.sprintActivado = true;
                    break;
            }
        });

        document.addEventListener('keyup', (event) => {
            switch (event.code) {
                case 'KeyW':
                    this.moverAdelante = false;
                    break;
                case 'KeyS':
                    this.moverAtras = false;
                    break;
                case 'KeyA':
                    this.moverIzquierda = false;
                    break;
                case 'KeyD':
                    this.moverDerecha = false;
                    break;
                case 'ShiftLeft':  
                case 'ShiftRight':
                    this.sprintActivado = false;
                    break;
            }
        });
    }

    crearAmbienteRealista() {
        // Fondo de escena más complejo
        this.escena.background = new THREE.Color(0x121212);
        
        // Material avanzado para paredes con textura y profundidad
        const cargadorTextura = new THREE.TextureLoader();
        const texturaPared = cargadorTextura.load('https://cdn.midjourney.com/abandoned-house-wall-texture.jpg');
        texturaPared.wrapS = THREE.RepeatWrapping;
        texturaPared.wrapT = THREE.RepeatWrapping;
        texturaPared.repeat.set(4, 4);

        const materialPared = new THREE.MeshStandardMaterial({ 
            map: texturaPared,
            roughness: 0.8,
            metalness: 0.2,
            normalScale: new THREE.Vector2(0.5, 0.5)
        });

        const geometriaCasa = new THREE.BoxGeometry(50, 20, 30);
        const casa = new THREE.Mesh(geometriaCasa, materialPared);
        casa.receiveShadow = true;
        this.escena.add(casa);

        // Iluminación más sofisticada
        const luzAmbiente = new THREE.AmbientLight(0x303030);
        this.escena.add(luzAmbiente);

        const luzDireccional = new THREE.DirectionalLight(0x606060, 0.7);
        luzDireccional.position.set(10, 20, 15);
        luzDireccional.castShadow = true;
        this.escena.add(luzDireccional);

        // Suelo realista con textura
        const texturaSuelo = cargadorTextura.load('https://cdn.midjourney.com/old-wooden-floor-texture.jpg');
        texturaSuelo.wrapS = THREE.RepeatWrapping;
        texturaSuelo.wrapT = THREE.RepeatWrapping;
        texturaSuelo.repeat.set(10, 10);

        const materialSuelo = new THREE.MeshStandardMaterial({ 
            map: texturaSuelo,
            roughness: 0.8,
            metalness: 0.1
        });
        const geometriaSuelo = new THREE.PlaneGeometry(50, 30);
        const suelo = new THREE.Mesh(geometriaSuelo, materialSuelo);
        suelo.rotation.x = -Math.PI / 2;
        suelo.position.y = 0;
        suelo.receiveShadow = true;
        this.escena.add(suelo);

        // Techo realista
        const texturaTecho = cargadorTextura.load('https://cdn.midjourney.com/old-ceiling-texture.jpg');
        texturaTecho.repeat.set(5, 5);

        const materialTecho = new THREE.MeshStandardMaterial({ 
            map: texturaTecho,
            roughness: 0.7,
            metalness: 0.2
        });
        const geometriaTecho = new THREE.PlaneGeometry(50, 30);
        const techo = new THREE.Mesh(geometriaTecho, materialTecho);
        techo.rotation.x = Math.PI / 2;
        techo.position.y = 2.5;
        techo.receiveShadow = true;
        this.escena.add(techo);
    }

    configurarLinternaAvanzada() {
        // Crear una luz focal para simular una linterna
        this.linterna = new THREE.SpotLight(0xffffff, 2, 100, Math.PI / 4, 0.5, 1);
        this.linterna.position.set(0, 0, 0);
        this.linterna.target.position.set(0, 0, -10);
        
        // Adjuntar la linterna a la cámara
        this.camara.add(this.linterna);
        this.camara.add(this.linterna.target);
        this.escena.add(this.linterna);
        
        // Desactivada inicialmente
        this.linterna.visible = false;
    }

    agregarMonstruosRealistas() {
        const geometriaMonstruo = new THREE.BoxGeometry(2, 4, 2);
        const materialMonstruo = new THREE.MeshPhongMaterial({ 
            color: 0x333333,
            emissive: 0x111111,
            shininess: 10
        });
        
        for(let i = 0; i < 5; i++) {
            const monstruo = new THREE.Mesh(geometriaMonstruo, materialMonstruo);
            monstruo.position.set(
                Math.random() * 40 - 20, 
                1, 
                Math.random() * 20 - 10
            );
            monstruo.castShadow = true;
            this.escena.add(monstruo);
        }
    }

    crearModeloPersonaje() {
        // Entidad etérea blanca más abstracta
        this.modeloPersonaje = new THREE.Group();

        // Crear un material blanco translúcido
        const materialBlanco = new THREE.MeshPhongMaterial({ 
          color: 0xFFFFFF,
          opacity: 0.6,
          transparent: true,
          shininess: 100,
          specular: 0xffffff
        });

        // Cuerpo central - forma flotante más abstracta
        const geometriaCuerpo = new THREE.IcosahedronGeometry(0.8, 1);
        const cuerpo = new THREE.Mesh(geometriaCuerpo, materialBlanco);
        cuerpo.position.set(0, 1.5, 0);

        // Agregar efecto de flotación sutil
        this.offsetFlotacion = 0;

        // Pequeñas esferas circundantes para crear un efecto etéreo
        const geometriaOrbita = new THREE.SphereGeometry(0.2, 16, 16);
        const orbitas = [];
        
        for(let i = 0; i < 3; i++) {
          const orbita = new THREE.Mesh(geometriaOrbita, materialBlanco.clone());
          orbita.position.set(
            Math.cos(i * Math.PI * 2 / 3) * 1.2, 
            1.5 + Math.sin(i * Math.PI * 2 / 3) * 0.3, 
            Math.sin(i * Math.PI * 2 / 3) * 1.2
          );
          orbitas.push(orbita);
          this.modeloPersonaje.add(orbita);
        }

        // Agregar efecto de luz
        const luz = new THREE.PointLight(0xffffff, 1, 5);
        luz.position.set(0, 1.5, 0);
        this.modeloPersonaje.add(luz);

        // Agregar cuerpo principal y elementos orbitales
        this.modeloPersonaje.add(cuerpo);

        // Agregar animación de pulso sutil
        this.modeloPersonaje.userData.update = () => {
          this.offsetFlotacion += 0.05;
          cuerpo.position.y = 1.5 + Math.sin(this.offsetFlotacion) * 0.1;
          
          orbitas.forEach((orbita, index) => {
            orbita.position.x = Math.cos((this.offsetFlotacion + index * Math.PI * 2 / 3)) * 1.2;
            orbita.position.z = Math.sin((this.offsetFlotacion + index * Math.PI * 2 / 3)) * 1.2;
          });
        };

        // Agregar el modelo de personaje a la escena
        this.escena.add(this.modeloPersonaje);
        this.modeloPersonaje.visible = false;  // Inicialmente oculto
    }

    alternarLinterna() {
        if (this.bateriaDeLinterna > 0) {
            this.linternaActivada = !this.linternaActivada;
            this.linterna.visible = this.linternaActivada;
        }
    }

    actualizarLinterna() {
        // Descargar batería cuando la linterna esté encendida
        if (this.linternaActivada) {
            this.bateriaDeLinterna = Math.max(0, this.bateriaDeLinterna - this.velocidadDescargaBateria);
            
            // Desactivar linterna si la batería está vacía
            if (this.bateriaDeLinterna <= 0) {
                this.linternaActivada = false;
                this.linterna.visible = false;
            }
        } else {
            // Recargar batería cuando la linterna esté apagada
            this.bateriaDeLinterna = Math.min(100, this.bateriaDeLinterna + this.velocidadRecargaBateria);
        }

        // Actualizar indicador de batería
        const indicadorBateria = document.getElementById('battery-indicator');
        indicadorBateria.textContent = `🔋 Batería: ${Math.round(this.bateriaDeLinterna)}%`;
    }

    alternarVistaTerceraPersona() {
        this.vistaTerceraPersona = !this.vistaTerceraPersona;
        
        if (this.vistaTerceraPersona) {
            // Mostrar modelo de personaje
            this.modeloPersonaje.visible = true;
            
            // Posicionar modelo de personaje frente a la cámara
            this.actualizarPosicionModeloPersonaje();
        } else {
            // Ocultar modelo de personaje
            this.modeloPersonaje.visible = false;
        }
    }

    actualizarPosicionModeloPersonaje() {
        if (!this.vistaTerceraPersona) return;

        // Crear un vector de dirección hacia adelante desde la cámara, ignorando el componente vertical
        const direccionAdelante = new THREE.Vector3(0, 0, -1);
        direccionAdelante.applyQuaternion(this.camara.quaternion);
        
        // Anular el componente vertical para mantener el movimiento horizontal
        direccionAdelante.y = 0;
        direccionAdelante.normalize();
        
        // Escalar la dirección hacia adelante para colocar el personaje a una distancia fija frente a la cámara
        const offsetPersonaje = direccionAdelante.multiplyScalar(3);
        
        // Crear un nuevo vector de posición, preservando la altura original de la cámara
        const nuevaPosicion = new THREE.Vector3(
            this.camara.position.x + offsetPersonaje.x,
            this.modeloPersonaje.position.y,  // Mantener posición vertical original
            this.camara.position.z + offsetPersonaje.z
        );
        
        // Posicionar el modelo de personaje frente a la cámara, horizontalmente
        this.modeloPersonaje.position.copy(nuevaPosicion);
        
        // Asegurarse de que el personaje mire la misma dirección horizontal que la cámara
        const cuaternionHorizontal = new THREE.Quaternion().setFromAxisAngle(
            new THREE.Vector3(0, 1, 0),  // Eje Y para rotación horizontal
            this.camara.rotation.y
        );
        this.modeloPersonaje.quaternion.copy(cuaternionHorizontal);
    }

    actualizarMovimiento() {
        this.velocidad.x = 0;
        this.velocidad.z = 0;

        if (this.moverAdelante) {
            this.velocidad.z -= this.sprintActivado ? this.velocidadSprint : this.velocidadNormal;
        }
        if (this.moverAtras) {
            this.velocidad.z += this.sprintActivado ? this.velocidadSprint : this.velocidadNormal;
        }
        if (this.moverIzquierda) {
            this.velocidad.x -= this.sprintActivado ? this.velocidadSprint : this.velocidadNormal;
        }
        if (this.moverDerecha) {
            this.velocidad.x += this.sprintActivado ? this.velocidadSprint : this.velocidadNormal;
        }

        // Crear un vector de dirección basado en la rotación actual de la cámara
        this.direccion.copy(this.velocidad);
        this.direccion.applyQuaternion(this.camara.quaternion);

        // Detección de colisiones para suelo y techo
        let nuevaPosicion = this.camara.position.clone().add(this.direccion);
        
        // Colisión con suelo
        if (nuevaPosicion.y < this.alturaMinima) {
            nuevaPosicion.y = this.alturaMinima;
        }
        
        // Colisión con techo
        if (nuevaPosicion.y > this.alturaMaxima) {
            nuevaPosicion.y = this.alturaMaxima;
        }

        // Mover la cámara
        this.camara.position.copy(nuevaPosicion);

        // Si está en vista de tercera persona, actualizar la posición del modelo de personaje para mantenerse frente a la cámara
        if (this.vistaTerceraPersona) {
            this.actualizarPosicionModeloPersonaje();
        }
    }

    actualizarInfoDepuracion() {
        const infoDepuracion = document.getElementById('debug-info');
        infoDepuracion.innerHTML = `
            Posición: ${this.camara.position.x.toFixed(2)}, 
            ${this.camara.position.y.toFixed(2)}, 
            ${this.camara.position.z.toFixed(2)}
        `;
    }

    animar() {
        requestAnimationFrame(this.animar.bind(this));
        
        this.actualizarMovimiento();
        this.actualizarLinterna();
        this.actualizarInfoDepuracion();

        // Actualizar animación de modelo de personaje si está visible
        if (this.modeloPersonaje && this.modeloPersonaje.visible && this.modeloPersonaje.userData.update) {
          this.modeloPersonaje.userData.update();
        }
        
        this.renderizador.render(this.escena, this.camara);
    }
}

window.addEventListener('load', () => {
    new JuegoDeTerror();
});