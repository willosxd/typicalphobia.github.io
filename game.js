import * as THREE from 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.module.js';
import { PointerLockControls } from 'https://cdn.jsdelivr.net/npm/three@0.128.0/examples/jsm/controls/PointerLockControls.js';

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

    this.camara.position.set(0, 2, 5);

    // Añadir manejador de redimensionamiento de ventana
    window.addEventListener('resize', this.alRedimensionarVentana.bind(this));

    this.configurarMenuDesarrollador();
    this.configurarModoBuilder();
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
          this.alternarLuzPersonal();
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

    // Techo con manejo de errores
    const texturaTecho = cargadorTextura.load(
      'https://i.imgur.com/bQGqKfh.jpg',
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
        // Crear textura sólida como respaldo
        const texturaAlternativa = new THREE.DataTexture(
          new Uint8Array([30, 30, 30, 255]),
          1,
          1,
          THREE.RGBAFormat
        );
        texturaAlternativa.needsUpdate = true;
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

  agregarMonstruosRealistas(cantidad = 5) {
    const geometriaMonstruo = new THREE.BoxGeometry(2, 4, 2);
    const materialMonstruo = new THREE.MeshPhongMaterial({
      color: 0x333333,
      emissive: 0x111111,
      shininess: 10
    });

    for (let i = 0; i < cantidad; i++) {
      const monstruo = new THREE.Mesh(geometriaMonstruo, materialMonstruo);
      monstruo.name = 'monstruo';
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

  alternarLuzPersonal() {
    this.luzPersonal.visible = !this.luzPersonal.visible;
    
    // Adjust ambient light based on flashlight state
    if (this.luzPersonal.visible) {
        // When flashlight is on, keep ambient light at low intensity
        this.luzAmbiente.intensity = 0.2;
    } else {
        // When flashlight is off, set ambient light to the same intensity as when battery is very low
        this.luzAmbiente.intensity = 0.1; // Very low, consistent intensity
    }
  }

  alternarVistaTerceraPersona() {
    this.vistaTerceraPersona = !this.vistaTerceraPersona;

    if (this.vistaTerceraPersona) {
      this.modeloPersonaje.visible = true;

      this.actualizarPosicionModeloPersonaje();
    } else {
      this.modeloPersonaje.visible = false;
    }
  }

  actualizarPosicionModeloPersonaje() {
    if (!this.vistaTerceraPersona) return;

    const direccionAdelante = new THREE.Vector3(0, 0, -1);
    direccionAdelante.applyQuaternion(this.camara.quaternion);

    direccionAdelante.y = 0;
    direccionAdelante.normalize();

    const offsetPersonaje = direccionAdelante.multiplyScalar(3);

    const nuevaPosicion = new THREE.Vector3(
      this.camara.position.x + offsetPersonaje.x,
      this.modeloPersonaje.position.y,
      this.camara.position.z + offsetPersonaje.z
    );

    this.modeloPersonaje.position.copy(nuevaPosicion);

    const cuaternionHorizontal = new THREE.Quaternion().setFromAxisAngle(
      new THREE.Vector3(0, 1, 0),
      this.camara.rotation.y
    );
    this.modeloPersonaje.quaternion.copy(cuaternionHorizontal);
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

    if (this.vistaTerceraPersona) {
      this.actualizarPosicionModeloPersonaje();
    }

    // Update flashlight position and direction
    if (this.luzPersonal.visible) {
      // Position the light at the camera's position
      this.luzPersonal.position.copy(this.camara.position);

      // Calculate the direction the camera is pointing
      const direccionLinterna = new THREE.Vector3(0, 0, -1);
      direccionLinterna.applyQuaternion(this.camara.quaternion);

      // Set the target of the spotlight to create the flashlight effect
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

  crearIndicadorBateria() {
    const batteryIndicator = document.getElementById('battery-indicator');
    if (batteryIndicator) {
        // The indicator is now pre-created in HTML, so we just need to update its content
        batteryIndicator.style.display = 'block';
    }
  }

  actualizarBateria() {
    if (this.bateriaInfinita) return; // Skip battery drain if infinite battery is enabled

    if (this.luzPersonal.visible) {
        // Even faster battery drain when flashlight is on
        this.bateriaTiempoActual -= 0.05; // Increased drain rate
    } else {
        // Slower battery recharge when flashlight is off
        this.bateriaTiempoActual = Math.min(
            this.bateriaTiempoTotal, 
            this.bateriaTiempoActual + 0.02
        );
    }

    // Check if battery is depleted
    if (this.bateriaTiempoActual <= 0) {
        this.bateriaTiempoActual = 0;
        this.bateriaAgotada = true;
        this.luzPersonal.visible = false;
    }

    // Adjust light intensity based on battery level
    const porcentajeBateria = Math.max(
        0,
        (this.bateriaTiempoActual / this.bateriaTiempoTotal) * 100
    );

    // Update battery indicator
    const batteryIndicator = document.getElementById('battery-indicator');
    if (batteryIndicator) {
        batteryIndicator.innerHTML = ` Batería: ${porcentajeBateria.toFixed(0)}%`;

        // More dramatic lighting changes
        if (porcentajeBateria <= 20) {
            // Dramatically reduce light intensity
            this.luzPersonal.intensity = this.intensidadLuzBaja * 0.5;
            this.luzAmbiente.intensity = 0.1; // Very dark
            batteryIndicator.style.color = 'red';
            batteryIndicator.style.fontWeight = 'bold';
        } else if (porcentajeBateria <= 50) {
            this.luzPersonal.intensity = this.intensidadLuzBaja;
            this.luzAmbiente.intensity = 0.15; // Slightly brighter
            batteryIndicator.style.color = 'orange';
        } else {
            this.luzPersonal.intensity = this.intensidadLuzNormal;
            this.luzAmbiente.intensity = 0.2; // Normal ambient
            batteryIndicator.style.color = 'white';
            batteryIndicator.style.fontWeight = 'normal';
        }
    }
  }

  recargarBateria() {
    this.bateriaTiempoActual = this.bateriaTiempoTotal;
    this.bateriaAgotada = false;
    // Restore normal light intensity when recharging
    this.luzPersonal.intensity = this.intensidadLuzNormal;
  }

  toggleHitboxes() {
    // Remove existing hitboxes first
    this.hitboxHelper.forEach(helper => {
      this.escena.remove(helper);
    });
    this.hitboxHelper = [];

    this.hitboxesVisibles = !this.hitboxesVisibles;

    if (this.hitboxesVisibles) {
      // Find and create hitbox helpers for objects
      this.escena.children.forEach(objeto => {
        // Only create hitboxes for certain types of objects
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
    this.vistaTerceraPersona = false;
    this.modeloPersonaje.visible = false;

    this.camara.position.set(0, 2, 5);

    this.toggleMenuDesarrollador();
    this.toggleMenuDesarrollador();

    this.limpiarLucesDinamicas();

    console.log('Todos los ajustes han sido restablecidos a sus valores predeterminados.');
  }

  configurarModoBuilder() {
    const botonModoBuilder = document.getElementById('builder-mode');
    const menuBuilder = document.getElementById('builder-menu');
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

  animar() {
    requestAnimationFrame(this.animar.bind(this));

    this.actualizarMovimiento();
    this.actualizarInfoDepuracion();
    this.actualizarBateria();

    // Update hitbox positions if they are visible
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

    if (
      this.modeloPersonaje &&
      this.modeloPersonaje.visible &&
      this.modeloPersonaje.userData.update
    ) {
      this.modeloPersonaje.userData.update();
    }

    this.renderizador.render(this.escena, this.camara);
  }
}

window.addEventListener('load', () => {
  new JuegoDeTerror();
});
