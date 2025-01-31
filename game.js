import * as THREE from 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.module.js';
import { PointerLockControls } from 'https://cdn.jsdelivr.net/npm/three@0.128.0/examples/jsm/controls/PointerLockControls.js';
import { CSS3DRenderer, CSS3DObject } from 'https://cdn.jsdelivr.net/npm/three@0.128.0/examples/jsm/renderers/CSS3DRenderer.js';

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

    // Modelo de personaje avanzado
    this.modeloPersonaje = null;

    this.sprintActivado = false;
    this.keySequence = [];
    this.developerModeEnabled = false;
    this.modoSinColision = false;
    this.bateriaInfinita = false;

    // Battery system
    this.bateriaTiempoTotal = 120; // 2 minutes of battery life
    this.bateriaTiempoActual = this.bateriaTiempoTotal;
    this.bateriaAgotada = false;
    this.intensidadLuzNormal = 3; // Normal flashlight intensity
    this.intensidadLuzBaja = 1; // Reduced intensity when battery is low

    // Enhanced personal light to act like a flashlight with battery-dependent intensity
    this.luzPersonal = new THREE.SpotLight(0xffffff, this.intensidadLuzNormal, 100, Math.PI / 4, 0.5, 1);
    this.luzPersonal.position.set(0, 2, 0);
    this.luzPersonal.target.position.set(0, 2, -5);
    this.escena.add(this.luzPersonal);
    this.escena.add(this.luzPersonal.target);
    this.luzPersonal.visible = false;

    // Add a low-intensity ambient light for minimal visibility
    this.luzAmbiente = new THREE.AmbientLight(0x222222, 0.2); // Very low intensity, dark grayish color
    this.escena.add(this.luzAmbiente);

    // Battery indicator
    this.crearIndicadorBateria();

    // Add a property to track hitbox visibility
    this.hitboxesVisibles = false;
    this.hitboxHelper = [];

    this.configurarControles();
    this.configurarControlesTeclado();
    this.crearAmbienteRealista();
    this.agregarMonstruosRealistas();
    this.crearModeloPersonaje();

    // Add black entity creation
    this.agregarEntidadNegra();

    this.camara.position.set(0, 2, 5);

    // Añadir manejador de redimensionamiento de ventana
    window.addEventListener('resize', this.alRedimensionarVentana.bind(this));

    this.configurarMenuDesarrollador();
    this.configurarModoBuilder();
    this.detectarDispositivo();
    this.configurarBotonesMenuJuego();
    this.animar();
  }

  detectarDispositivo() {
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    
    if (isMobile) {
        console.log('Dispositivo móvil detectado. Configurando controles móviles.');
        
        const mobileControls = document.getElementById('mobile-controls');
        mobileControls.classList.remove('hidden');

        // Movement buttons
        const moveForward = document.getElementById('move-forward');
        const moveBackward = document.getElementById('move-backward');
        const moveLeft = document.getElementById('move-left');
        const moveRight = document.getElementById('move-right');
        const flashlightButton = document.getElementById('mobile-flashlight');
        const sprintButton = document.getElementById('mobile-sprint');

        // Touch event handling for movement
        const startMovement = (direction) => {
            switch(direction) {
                case 'forward': this.moverAdelante = true; break;
                case 'backward': this.moverAtras = true; break;
                case 'left': this.moverIzquierda = true; break;
                case 'right': this.moverDerecha = true; break;
            }
        };

        const stopMovement = (direction) => {
            switch(direction) {
                case 'forward': this.moverAdelante = false; break;
                case 'backward': this.moverAtras = false; break;
                case 'left': this.moverIzquierda = false; break;
                case 'right': this.moverDerecha = false; break;
            }
        };

        // Add touch event listeners
        moveForward.addEventListener('touchstart', () => startMovement('forward'));
        moveForward.addEventListener('touchend', () => stopMovement('forward'));
        
        moveBackward.addEventListener('touchstart', () => startMovement('backward'));
        moveBackward.addEventListener('touchend', () => stopMovement('backward'));
        
        moveLeft.addEventListener('touchstart', () => startMovement('left'));
        moveLeft.addEventListener('touchend', () => stopMovement('left'));
        
        moveRight.addEventListener('touchstart', () => startMovement('right'));
        moveRight.addEventListener('touchend', () => stopMovement('right'));

        // Flashlight toggle
        flashlightButton.addEventListener('click', () => this.alternarLuzPersonal());

        // Sprint toggle
        let sprintActive = false;
        sprintButton.addEventListener('touchstart', () => {
            sprintActive = true;
            this.sprintActivado = true;
        });
        sprintButton.addEventListener('touchend', () => {
            sprintActive = false;
            this.sprintActivado = false;
        });

        // Touch-based camera movement
        document.addEventListener('touchmove', (event) => {
            if (event.touches.length === 1) {
                const touch = event.touches[0];
                const movementX = touch.movementX || touch.mozMovementX || touch.webkitMovementX || 0;
                const movementY = touch.movementY || touch.mozMovementY || touch.webkitMovementY || 0;

                // Adjust sensitivity as needed
                const sensitivity = 0.5;
                
                // Rotate the camera
                this.camara.rotation.y -= movementX * sensitivity * 0.01;
                this.camara.rotation.x -= movementY * sensitivity * 0.01;

                // Limit vertical rotation
                this.camara.rotation.x = Math.max(-Math.PI/2, Math.min(Math.PI/2, this.camara.rotation.x));
            }
        });

        // Modify pointer lock to work with mobile
        document.getElementById('interaction-prompt').addEventListener('touchstart', () => {
            this.controles.lock();
            document.getElementById('interaction-prompt').style.display = 'none';
        });
    } else {
        // Explicitly hide mobile controls on desktop
        const mobileControls = document.getElementById('mobile-controls');
        mobileControls.classList.add('hidden');
        mobileControls.style.display = 'none';
    }
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
          this.alternarLuzPersonal();
          break;
        case 'KeyQ':
          this.toggleInGameMenu();
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
    // Fondo de escena más oscuro y ominoso
    this.escena.background = new THREE.Color(0x000000);

    // Cargar texturas de terror más atmosféricas
    const cargadorTextura = new THREE.TextureLoader();

    const texturaPared = cargadorTextura.load(
      'https://files.catbox.moe/500e6l.avif',
      () => {
        texturaPared.wrapS = THREE.RepeatWrapping;
        texturaPared.wrapT = THREE.RepeatWrapping;
        texturaPared.repeat.set(4, 4);
      }
    );

    const materialPared = new THREE.MeshStandardMaterial({
      map: texturaPared,
      roughness: 0.8,
      metalness: 0.2,
      normalScale: new THREE.Vector2(0.5, 0.5),
      color: 0x3a3a3a
    });

    // Crear paredes con orientación correcta
    const geometriaCasa = new THREE.BoxGeometry(50, 20, 30);
    const casa = new THREE.Mesh(geometriaCasa, materialPared);
    casa.receiveShadow = true;
    this.escena.add(casa);

    // Crear paredes individuales para controlar la orientación
    const paredes = [
      // Pared frontal
      { posicion: new THREE.Vector3(0, 10, -15), rotacion: new THREE.Vector3(0, 0, 0) },
      // Pared trasera
      { posicion: new THREE.Vector3(0, 10, 15), rotacion: new THREE.Vector3(0, Math.PI, 0) },
      // Pared izquierda
      { posicion: new THREE.Vector3(-25, 10, 0), rotacion: new THREE.Vector3(0, Math.PI / 2, 0) },
      // Pared derecha
      { posicion: new THREE.Vector3(25, 10, 0), rotacion: new THREE.Vector3(0, -Math.PI / 2, 0) }
    ];

    paredes.forEach((paredConfig) => {
      const pared = new THREE.Mesh(new THREE.PlaneGeometry(50, 20), materialPared);
      pared.position.copy(paredConfig.posicion);
      pared.rotation.setFromVector3(paredConfig.rotacion);
      pared.receiveShadow = true;
      this.escena.add(pared);
    });

    const texturaSuelo = cargadorTextura.load(
      'https://files.catbox.moe/ejpau4.png',
      () => {
        texturaSuelo.wrapS = THREE.RepeatWrapping;
        texturaSuelo.wrapT = THREE.RepeatWrapping;
        texturaSuelo.repeat.set(10, 10);
      }
    );

    const materialSuelo = new THREE.MeshStandardMaterial({
      map: texturaSuelo,
      roughness: 0.9,
      metalness: 0.1,
      color: 0x888888
    });
    const geometriaSuelo = new THREE.PlaneGeometry(50, 30);
    const suelo = new THREE.Mesh(geometriaSuelo, materialSuelo);
    suelo.rotation.x = -Math.PI / 2;
    suelo.position.y = 0;
    suelo.receiveShadow = true;
    this.escena.add(suelo);

    // Techo con la nueva imagen
    const texturaTecho = cargadorTextura.load(
      'https://i.postimg.cc/yY2tZvtp/81ly-PQAgg-DL-AC-UF894-1000-QL80.jpg',
      // Éxito
      () => {
        texturaTecho.wrapS = THREE.RepeatWrapping;
        texturaTecho.wrapT = THREE.RepeatWrapping;
        texturaTecho.repeat.set(5, 5);
      },
      // Progreso (opcional)
      undefined,
      // Error
      (error) => {
        console.error('Error cargando textura de techo:', error);
      }
    );

    const materialTecho = new THREE.MeshStandardMaterial({
      map: texturaTecho,
      roughness: 0.7,
      metalness: 0.2,
      color: 0x1a1a1a
    });
    const geometriaTecho = new THREE.PlaneGeometry(50, 30);
    const techo = new THREE.Mesh(geometriaTecho, materialTecho);
    techo.rotation.x = Math.PI / 2;
    techo.position.y = 2.9;
    techo.receiveShadow = true;
    this.escena.add(techo);

    // Añadir niebla para aumentar la atmósfera de terror
    this.escena.fog = new THREE.FogExp2(0x000000, 0.02);
  }

  agregarMonstruosRealistas(cantidad = 0) {
    console.log('Monster generation disabled');
  }

  crearModeloPersonaje() {
    // Entidad etérea blanca más abstracta
    this.modeloPersonaje = new THREE.Group();

    // Crear un material blanco translúcido
    const materialBlanco = new THREE.MeshPhongMaterial({
      color: 0xffffff,
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

    for (let i = 0; i < 3; i++) {
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
        orbita.position.x = Math.cos(
          this.offsetFlotacion + index * Math.PI * 2 / 3
        ) * 1.2;
        orbita.position.z = Math.sin(
          this.offsetFlotacion + index * Math.PI * 2 / 3
        ) * 1.2;
      });
    };

    // Agregar el modelo de personaje a la escena
    this.escena.add(this.modeloPersonaje);
    this.modeloPersonaje.visible = false;
  }

  agregarEntidadNegra() {
    const geometriaEntidad = new THREE.BufferGeometry();
    
    // More humanoid vertex configuration
    const vertices = new Float32Array([
      // Body
      0, 2, 0,    // Head top
      0, 1.5, 0,  // Neck
      -0.5, 1, 0, // Left shoulder
      0.5, 1, 0,  // Right shoulder
      -0.3, 0.5, 0, // Left waist
      0.3, 0.5, 0,  // Right waist
      0, 0, 0,    // Pelvis center
      
      // Arms
      -0.7, 1, 0.2,  // Left upper arm
      0.7, 1, 0.2,   // Right upper arm
      -0.8, 0.5, 0.2, // Left lower arm
      0.8, 0.5, 0.2   // Right lower arm
    ]);

    const indices = new Uint16Array([
      // Body connections
      0, 1, 2,
      0, 1, 3,
      1, 2, 4,
      1, 3, 5,
      4, 5, 6,
      
      // Arm connections
      2, 7, 9,
      3, 8, 10,
      7, 9, 4,
      8, 10, 5
    ]);

    geometriaEntidad.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
    geometriaEntidad.setIndex(new THREE.BufferAttribute(indices, 1));
    
    // Enhanced shader material with black color and intense white aura
    const materialEntidad = new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0 },
        glitchIntensity: { value: 0.2 },  
        auraColor: { value: new THREE.Color(1, 1, 1) },
        auraIntensity: { value: 6.0 },    
        auraWidth: { value: 2.0 },
        opacity: { value: 0.7 }
      },
      vertexShader: `
        uniform float time;
        uniform float glitchIntensity;
        
        varying vec3 vPosition;
        varying vec3 vNormal;
        varying vec3 vViewPosition;
        
        void main() {
          vec3 pos = position;
          
          // More subtle but slightly stronger glitch effect
          float noiseX = sin(time * pos.x * 0.7) * glitchIntensity;  
          float noiseY = cos(time * pos.y * 0.7) * glitchIntensity * 0.7;
          float noiseZ = tan(time * pos.z * 0.7) * glitchIntensity * 0.3;
          
          pos.x += noiseX * (pos.y - 1.0) * 1.2;  
          pos.y += noiseY * 0.3;
          pos.z += noiseZ * 0.2;
          
          vPosition = pos;
          vNormal = normalMatrix * normal;
          vViewPosition = (modelViewMatrix * vec4(pos, 1.0)).xyz;
          
          gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
        }
      `,
      fragmentShader: `
        uniform float time;
        uniform vec3 auraColor;
        uniform float auraIntensity;
        uniform float auraWidth;
        uniform float opacity;
        
        varying vec3 vPosition;
        varying vec3 vNormal;
        varying vec3 vViewPosition;
        
        void main() {
          // More subtle and organic fresnel effect for soft, pulsing aura
          vec3 viewDirection = normalize(-vViewPosition);
          float fresnelFactor = pow(1.0 - abs(dot(vNormal, viewDirection)), auraWidth);
          
          // Slightly faster and more intense pulses
          float pulse1 = sin(time * 0.7) * 0.4 + 0.6;
          float pulse2 = cos(time * 0.5) * 0.3 + 0.7;
          
          // Combine pulses for more organic, slightly more aggressive movement
          float dynamicPulse = (pulse1 + pulse2) * 0.5;
          
          // Intense white aura with dynamic intensity
          vec3 finalAuraColor = auraColor * fresnelFactor * auraIntensity * dynamicPulse;
          
          // Base black color with glitch effect
          vec3 baseColor = vec3(0.0, 0.0, 0.0);
          
          // Soft noise for subtle glitch effect
          float noise1 = fract(sin(dot(vPosition.xy + time * 0.7, vec2(12.9898, 78.233))) * 43758.5453);
          float noise2 = fract(sin(dot(vPosition.yz + time * 0.5, vec2(51.14, 289.76))) * 14537.6231);
          
          // Combine black base color with white aura
          vec3 finalColor = baseColor + finalAuraColor + 
                            vec3(noise1, noise2, (noise1 + noise2) * 0.5) * 0.05;
          
          // Combine color with base opacity and add some transparency variation
          gl_FragColor = vec4(finalColor, opacity * fresnelFactor * dynamicPulse);
        }
      `,
      transparent: true,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      depthWrite: false
    });

    const entidadNegra = new THREE.Mesh(geometriaEntidad, materialEntidad);
    entidadNegra.name = 'entidad_negra';

    // Positioning with some randomness
    entidadNegra.position.set(
      Math.random() * 20 - 10,  
      1,                        
      Math.random() * 10 - 5    
    );

    // Rotation and movement logic
    let animationOffset = 0;
    entidadNegra.userData.update = () => {
      animationOffset += 0.03;  

      // Update shader uniforms dynamically
      materialEntidad.uniforms.time.value = animationOffset;
      
      // More subtle, organic-like movements with slightly increased amplitude
      entidadNegra.position.y = 1 + Math.sin(animationOffset) * 0.2;  

      // No rotation as per previous instructions
    };

    this.escena.add(entidadNegra);
    return entidadNegra;
  }

  teleportarAEntidadNegra() {
    const entidadNegra = this.escena.children.find(child => child.name === 'entidad_negra');

    if (entidadNegra) {
      this.camara.position.copy(entidadNegra.position);
      this.camara.position.y += 2; 

      this.toggleMenuDesarrollador();
    } else {
      console.log('No se encontró la entidad negra');
    }
  }

  alternarLuzPersonal() {
    this.luzPersonal.visible = !this.luzPersonal.visible;

    if (this.luzPersonal.visible) {
        this.luzAmbiente.intensity = 0.2;
    } else {
        this.luzAmbiente.intensity = 0.1; 
    }
  }

  alternarVistaTerceraPersona() {
    // No-op method
    return;
  }

  actualizarPosicionModeloPersonaje() {
    // No-op method
    return;
  }

  actualizarMovimiento() {
    this.velocidad.x = 0;
    this.velocidad.z = 0;

    if (this.moverAdelante) {
      this.velocidad.z -= this.sprintActivado
        ? this.velocidadSprint
        : this.velocidadNormal;
    }
    if (this.moverAtras) {
      this.velocidad.z += this.sprintActivado
        ? this.velocidadSprint
        : this.velocidadNormal;
    }
    if (this.moverIzquierda) {
      this.velocidad.x -= this.sprintActivado
        ? this.velocidadSprint
        : this.velocidadNormal;
    }
    if (this.moverDerecha) {
      this.velocidad.x += this.sprintActivado
        ? this.velocidadSprint
        : this.velocidadNormal;
    }

    this.direccion.copy(this.velocidad);
    this.direccion.applyQuaternion(this.camara.quaternion);

    let nuevaPosicion = this.camara.position.clone().add(this.direccion);

    if (!this.modoSinColision) {
      if (nuevaPosicion.y < this.alturaMinima) {
        nuevaPosicion.y = this.alturaMinima;
      }

      if (nuevaPosicion.y > this.alturaMaxima) {
        nuevaPosicion.y = this.alturaMaxima;
      }
    }

    this.camara.position.copy(nuevaPosicion);

    if (this.luzPersonal.visible) {
      this.luzPersonal.position.copy(this.camara.position);

      const direccionLinterna = new THREE.Vector3(0, 0, -1);
      direccionLinterna.applyQuaternion(this.camara.quaternion);

      this.luzPersonal.target.position.copy(
        this.camara.position.clone().add(direccionLinterna.multiplyScalar(10))
      );
    }
  }

  actualizarInfoDepuracion() {
    const infoDepuracion = document.getElementById('debug-info');
    infoDepuracion.innerHTML = `
      Posición: (${this.camara.position.x.toFixed(2)}, ${this.camara.position.y.toFixed(
      2
    )}, ${this.camara.position.z.toFixed(2)})
    `;
  }

  actualizarBateria() {
    if (this.bateriaInfinita) return; 

    if (this.luzPersonal.visible) {
        this.bateriaTiempoActual -= 0.02; 
    } else {
        this.bateriaTiempoActual = Math.min(
            this.bateriaTiempoTotal, 
            this.bateriaTiempoActual + 0.02
        );
    }

    if (this.bateriaTiempoActual <= 0) {
        this.bateriaTiempoActual = 0;
        this.bateriaAgotada = true;
        this.luzPersonal.visible = false;
    }

    const porcentajeBateria = Math.max(
        0,
        (this.bateriaTiempoActual / this.bateriaTiempoTotal) * 100
    );

    const batteryBars = document.querySelectorAll('.battery-bar');
    const batteryIndicator = document.getElementById('battery-indicator');

    let activeBars = 0;
    if (porcentajeBateria > 70) activeBars = 4;
    else if (porcentajeBateria > 30) activeBars = 3;
    else if (porcentajeBateria > 10) activeBars = 1;

    batteryBars.forEach((bar, index) => {
        bar.classList.remove('active', 'warning', 'critical');
        
        if (index < activeBars) {
            bar.classList.add('active');
            
            if (porcentajeBateria <= 20) {
                bar.classList.add('critical');
            } else if (porcentajeBateria <= 30) {
                bar.classList.add('warning');
            }
        }
    });

    if (porcentajeBateria <= 20) {
        this.luzPersonal.intensity = this.intensidadLuzBaja * 0.5;
        this.luzAmbiente.intensity = 0.1; 
    } else if (porcentajeBateria <= 50) {
        this.luzPersonal.intensity = this.intensidadLuzBaja;
        this.luzAmbiente.intensity = 0.15; 
    } else {
        this.luzPersonal.intensity = this.intensidadLuzNormal;
        this.luzAmbiente.intensity = 0.2; 
    }
  }

  recargarBateria() {
    this.bateriaTiempoActual = this.bateriaTiempoTotal;
    this.bateriaAgotada = false;
    this.luzPersonal.intensity = this.intensidadLuzNormal;
  }

  toggleHitboxes() {
    this.hitboxHelper.forEach(helper => {
      this.escena.remove(helper);
    });
    this.hitboxHelper = [];

    this.hitboxesVisibles = !this.hitboxesVisibles;

    if (this.hitboxesVisibles) {
      this.escena.children.forEach(objeto => {
        if (objeto.isMesh || objeto.isPointLight) {
          const bbox = new THREE.Box3().setFromObject(objeto);
          const bboxHelper = new THREE.Box3Helper(bbox, 0xff0000);
          this.escena.add(bboxHelper);
          this.hitboxHelper.push(bboxHelper);
        }
      });

      console.log(`Mostrando ${this.hitboxHelper.length} hitboxes`);
    } else {
      console.log('Hitboxes ocultos');
    }
  }

  crearIndicadorBateria() {
    const batteryIndicator = document.getElementById('battery-indicator');
    if (batteryIndicator) {
        batteryIndicator.style.display = 'block';
    }
  }

  configurarMenuDesarrollador() {
    document.addEventListener('keydown', (event) => {
      this.keySequence.push(event.key);

      if (this.keySequence.length > 4) {
        this.keySequence.shift();
      }

      if (this.keySequence.join('') === '1893') {
        this.toggleMenuDesarrollador();
      }
    });

    document.getElementById('close-dev-menu').addEventListener('click', () => {
      this.toggleMenuDesarrollador();
    });

    document.getElementById('toggle-hitbox').addEventListener('click', () => {
      this.toggleHitboxes();
    });

    document.getElementById('spawn-monster').addEventListener('click', () => {
      this.agregarMonstruosRealistas(1);
    });

    document.getElementById('reset-position').addEventListener('click', () => {
      this.camara.position.set(0, 2, 5);
    });

    document.getElementById('toggle-noclip').addEventListener('click', () => {
      this.modoSinColision = !this.modoSinColision;
      console.log('Modo sin colisión:', this.modoSinColision);
    });

    document.getElementById('infinite-battery').addEventListener('click', () => {
      this.bateriaInfinita = !this.bateriaInfinita;
      console.log('Batería infinita:', this.bateriaInfinita);
    });

    document.getElementById('reset-all-settings').addEventListener('click', () => {
      this.restablecerTodosLosAjustes();
    });

    document.getElementById('recharge-battery').addEventListener('click', () => {
      this.recargarBateria();
    });

    document.getElementById('fill-map-lights').addEventListener('click', () => {
      this.llenarMapaConLuces();
    });

    const botonTeleportEntidad = document.getElementById('teleport-to-entity');
    botonTeleportEntidad.addEventListener('click', () => {
      this.teleportarAEntidadNegra();
    });
  }

  llenarMapaConLuces(cantidadLuces = 20) {
    for (let i = 0; i < cantidadLuces; i++) {
      const colorLuz = new THREE.Color(
        Math.random(),
        Math.random(),
        Math.random()
      );

      const luz = new THREE.PointLight(colorLuz, 0.5, 30);
      luz.position.set(
        Math.random() * 40 - 20,
        Math.random() * 10 + 2,
        Math.random() * 20 - 10
      );

      if (Math.random() > 0.8) {
        luz.castShadow = true;
        luz.shadow.mapSize.width = 256;
        luz.shadow.mapSize.height = 256;
      }

      this.escena.add(luz);

      if (!this.lucesDinamicas) {
        this.lucesDinamicas = [];
      }
      this.lucesDinamicas.push(luz);
    }
  }

  limpiarLucesDinamicas() {
    if (this.lucesDinamicas) {
      this.lucesDinamicas.forEach((luz) => {
        this.escena.remove(luz);
        if (luz.shadow && luz.shadow.map) {
          luz.shadow.map.dispose();
        }
      });
      this.lucesDinamicas = [];
    }
  }

  toggleMenuDesarrollador() {
    const menuDesarrollador = document.getElementById('developer-menu');
    const estaOculto = menuDesarrollador.classList.contains('hidden');

    if (estaOculto) {
      menuDesarrollador.classList.remove('hidden');
      menuDesarrollador.classList.add('visible');
      document.body.style.cursor = 'default';
      this.controles.unlock();
    } else {
      menuDesarrollador.classList.remove('visible');
      menuDesarrollador.classList.add('hidden');
      document.body.style.cursor = 'none';
      this.controles.lock();
    }

    this.actualizarEstadisticasDesarrollador();
  }

  actualizarEstadisticasDesarrollador() {
    const estadisticas = document.getElementById('dev-game-stats');
    estadisticas.innerHTML = `
      <p>Posición: (${this.camara.position.x.toFixed(
        2
      )}, ${this.camara.position.y.toFixed(2)}, ${this.camara.position.z.toFixed(
        2
      )})</p>
      <p>Monstruos en Escena: ${this.escena.children.filter(
        (child) => child.name === 'monstruo'
      ).length}</p>
    `;
  }

  restablecerTodosLosAjustes() {
    this.modoSinColision = false;
    this.bateriaInfinita = false;
    this.luzPersonal.visible = false;
    this.camara.position.set(0, 2, 5);

    this.toggleMenuDesarrollador();
    this.toggleMenuDesarrollador();

    this.limpiarLucesDinamicas();

    console.log('Todos los ajustes han sido restablecidos a sus valores predeterminados.');
  }

  configurarModoBuilder() {
    const botonModoBuilder = document.getElementById('builder-mode');
    const menuBuilder = document.getElementById('builder-menu');
    const menuDesarrollador = document.getElementById('developer-menu');
    const botonCerrarBuilder = document.getElementById('close-builder-menu');
    const botonColocarObjeto = document.getElementById('place-object');
    const botonEliminarUltimoObjeto = document.getElementById('delete-last-object');
    const botonLimpiarObjetos = document.getElementById('clear-all-objects');
    const selectTipoObjeto = document.getElementById('object-type');
    const inputColor = document.getElementById('object-color');
    const inputTamano = document.getElementById('object-size');
    const labelTamano = document.getElementById('size-value');

    this.objetosConstruidos = [];

    inputTamano.addEventListener('input', () => {
      labelTamano.textContent = inputTamano.value;
    });

    botonModoBuilder.addEventListener('click', () => {
      this.toggleModoBuilder();
    });

    botonCerrarBuilder.addEventListener('click', () => {
      this.toggleModoBuilder();
    });

    botonColocarObjeto.addEventListener('click', () => {
      const tipoObjeto = selectTipoObjeto.value;
      const color = inputColor.value;
      const tamano = parseFloat(inputTamano.value);

      let nuevoObjeto;
      switch (tipoObjeto) {
        case 'cube':
          const geometriaCubo = new THREE.BoxGeometry(tamano, tamano, tamano);
          const materialCubo = new THREE.MeshStandardMaterial({ color: color });
          nuevoObjeto = new THREE.Mesh(geometriaCubo, materialCubo);
          break;
        case 'sphere':
          const geometriaEsfera = new THREE.SphereGeometry(tamano / 2, 32, 32);
          const materialEsfera = new THREE.MeshStandardMaterial({ color: color });
          nuevoObjeto = new THREE.Mesh(geometriaEsfera, materialEsfera);
          break;
        case 'light':
          nuevoObjeto = new THREE.PointLight(color, 1, 100);
          break;
        case 'directional-light':
          nuevoObjeto = new THREE.DirectionalLight(color, 0.5);
          break;
      }

      const direccionFrente = new THREE.Vector3(0, 0, -5);
      direccionFrente.applyQuaternion(this.camara.quaternion);

      nuevoObjeto.position.copy(this.camara.position).add(direccionFrente);

      this.escena.add(nuevoObjeto);
      this.objetosConstruidos.push(nuevoObjeto);
    });

    botonEliminarUltimoObjeto.addEventListener('click', () => {
      if (this.objetosConstruidos.length > 0) {
        const ultimoObjeto = this.objetosConstruidos.pop();
        this.escena.remove(ultimoObjeto);
      }
    });

    botonLimpiarObjetos.addEventListener('click', () => {
      this.objetosConstruidos.forEach((objeto) => {
        this.escena.remove(objeto);
      });
      this.objetosConstruidos = [];
    });

    const botonEliminarLuces = document.getElementById('clear-all-lights');
    botonEliminarLuces.addEventListener('click', () => {
      this.limpiarLucesDinamicas();
    });
  }

  toggleModoBuilder() {
    const menuBuilder = document.getElementById('builder-menu');
    const menuDesarrollador = document.getElementById('developer-menu');
    const estaOculto = menuBuilder.classList.contains('hidden');

    if (estaOculto) {
      menuBuilder.classList.remove('hidden');
      menuBuilder.classList.add('visible');
      menuDesarrollador.classList.add('hidden');
      menuDesarrollador.classList.remove('visible');
      document.body.style.cursor = 'default';
      this.controles.unlock();
    } else {
      menuBuilder.classList.remove('visible');
      menuBuilder.classList.add('hidden');
      document.body.style.cursor = 'none';
      this.controles.lock();
    }
  }

  toggleInGameMenu() {
    const inGameMenu = document.getElementById('in-game-menu');
    const estaOculto = inGameMenu.classList.contains('hidden');

    if (estaOculto) {
      inGameMenu.classList.remove('hidden');
      inGameMenu.classList.add('visible');
      document.body.style.cursor = 'default';
      this.controles.unlock();
    } else {
      inGameMenu.classList.remove('visible');
      inGameMenu.classList.add('hidden');
      document.body.style.cursor = 'none';
      this.controles.lock();
    }

    // Add event listeners for in-game menu buttons
    this.configurarBotonesMenuJuego();
  }

  configurarBotonesMenuJuego() {
    const botonContinuar = document.getElementById('resume-game');
    const botonConfiguraciones = document.getElementById('settings-in-game');
    const botonSalirMenu = document.getElementById('exit-to-main-menu');

    botonContinuar.removeEventListener('click', this.toggleInGameMenu);
    botonContinuar.addEventListener('click', () => {
      this.toggleInGameMenu();
    });

    botonConfiguraciones.addEventListener('click', () => {
      // TODO: Implement in-game settings
      console.log('Configuraciones del juego');
    });

    botonSalirMenu.addEventListener('click', () => {
      // Reset game state and return to main menu
      const gameContainer = document.getElementById('game-container');
      const startMenu = document.getElementById('start-menu');
      
      gameContainer.classList.add('hidden');
      startMenu.classList.remove('hidden');
      
      // Stop the game, reset controls, etc.
      this.controles.unlock();
      this.toggleInGameMenu();
    });
  }

  animar() {
    requestAnimationFrame(this.animar.bind(this));

    this.actualizarMovimiento();
    this.actualizarInfoDepuracion();
    this.actualizarBateria();

    if (this.hitboxesVisibles) {
      this.hitboxHelper.forEach((helper, index) => {
        const objeto = this.escena.children.filter(child => 
          child.isMesh || child.isPointLight
        )[index];
        
        if (objeto) {
          const bbox = new THREE.Box3().setFromObject(objeto);
          helper.box.copy(bbox);
        }
      });
    }

    const entidadNegra = this.escena.children.find(child => child.name === 'entidad_negra');
    if (entidadNegra && entidadNegra.userData.update) {
      entidadNegra.userData.update();
    }

    this.renderizador.render(this.escena, this.camara);
  }
}

window.addEventListener('load', () => {
  const startMenu = document.getElementById('start-menu');
  const gameContainer = document.getElementById('game-container');
  const startGameBtn = document.getElementById('start-game-btn');
  const settingsBtn = document.getElementById('settings-btn');
  const creditsBtn = document.getElementById('credits-btn');
  const settingsPanel = document.getElementById('settings-panel');
  const creditsPanel = document.getElementById('credits-panel');
  const backFromSettings = document.getElementById('back-from-settings');
  const backFromCredits = document.getElementById('back-from-credits');

  startGameBtn.addEventListener('click', () => {
    startMenu.classList.add('hidden');
    gameContainer.classList.remove('hidden');
    new JuegoDeTerror();
  });

  settingsBtn.addEventListener('click', () => {
    document.querySelector('.menu-buttons').classList.add('hidden');
    settingsPanel.classList.remove('hidden');
  });

  creditsBtn.addEventListener('click', () => {
    document.querySelector('.menu-buttons').classList.add('hidden');
    creditsPanel.classList.remove('hidden');
  });

  backFromSettings.addEventListener('click', () => {
    settingsPanel.classList.add('hidden');
    document.querySelector('.menu-buttons').classList.remove('hidden');
  });

  backFromCredits.addEventListener('click', () => {
    creditsPanel.classList.add('hidden');
    document.querySelector('.menu-buttons').classList.remove('hidden');
  });
});