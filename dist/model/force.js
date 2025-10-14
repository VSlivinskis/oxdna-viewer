function forcesToString(newElementIDs) {
    return forceHandler.forces.map(f => f.toString(newElementIDs)).join('\n\n');
}
class Force {
    type;
    sceneObjects = [];
}
// Forces which can be drawn as a line between two particles
class PairwiseForce extends Force {
    equals(compareForce) {
        if (!(compareForce instanceof PairwiseForce)) {
            return false;
        }
        return (this.particle === compareForce.particle &&
            this.ref_particle === compareForce.ref_particle);
    }
}
class MutualTrap extends PairwiseForce {
    type = 'mutual_trap';
    particle; // the particle on which to exert the force.
    ref_particle; // particle to pull towards. Please note that this particle will not feel any force (the name mutual trap is thus misleading).
    stiff; // stiffness of the trap.
    r0; // equilibrium distance of the trap.
    PBC;
    force = [];
    eqDists = [];
    set(particle, ref_particle, stiff = 0.09, r0 = 1.2, PBC = 1) {
        this.particle = particle;
        this.ref_particle = ref_particle;
        this.stiff = stiff;
        this.r0 = r0;
        this.PBC = PBC;
        this.update();
    }
    equals(compareForce) {
        if (!(compareForce instanceof MutualTrap)) {
            return false;
        }
        return (this.particle === compareForce.particle &&
            this.ref_particle === compareForce.ref_particle &&
            this.stiff === compareForce.stiff &&
            this.r0 === compareForce.r0 &&
            this.PBC === compareForce.PBC);
    }
    setFromParsedJson(parsedjson) {
        for (var param in parsedjson) {
            if (['particle', 'ref_particle'].includes(param)) {
                this[param] = elements.get(parsedjson[param]);
                if (this[param] === undefined) {
                    const err = `Particle ${parsedjson[param]} in parsed force file does not exist.`;
                    notify(err, "alert");
                    throw (err);
                }
            }
            else {
                this[param] = parsedjson[param];
            }
        }
        this.update();
    }
    toJSON() {
        return {
            type: this.type,
            particle: this.particle.id,
            ref_particle: this.ref_particle.id,
            stiff: this.stiff,
            r0: this.r0,
            PBC: this.PBC
        };
    }
    toString(idMap) {
        if (elements.has(this.particle.id) && elements.has(this.ref_particle.id)) {
            return (`{
    type = ${this.type}
    particle = ${idMap ? idMap.get(this.particle) : this.particle.id}
    ref_particle = ${idMap ? idMap.get(this.ref_particle) : this.ref_particle.id}
    stiff = ${this.stiff}
    r0 = ${this.r0}
    PBC = ${this.PBC}
}`);
        }
        else {
            notify(`${this.description()} includes a particle that no longer exists`, 'alert', true);
            return "";
        }
    }
    description() {
        return `Mutual trap pulling ${this.particle.id} towards ${this.ref_particle.id}`;
    }
    update() {
        const p1 = this.particle.getInstanceParameter3("bbOffsets"); // position from which to exert the force.
        const p2 = this.ref_particle.getInstanceParameter3("bbOffsets"); // position to pull towards.
        let dir = p2.clone().sub(p1).normalize();
        this.eqDists = [
            p1, p1.clone().add(dir.clone().multiplyScalar(this.r0))
        ];
        // length and direction of line segement
        dir = p2.clone().sub(p1);
        let force_v = dir.clone().normalize().multiplyScalar((dir.length() - this.r0) * this.stiff);
        dir.normalize();
        this.force = [
            p1, p1.clone().add(dir.multiplyScalar(force_v.length()))
        ];
    }
}
class SkewTrap extends PairwiseForce {
    type = 'skew_trap';
    particle; // the particle on which to exert the force.
    ref_particle; // particle to pull towards. Please note that this particle will not feel any force (the name mutual trap is thus misleading).
    stdev; // width of the trap potential
    shape; // skew of the trap potential
    r0; // equilibrium distance of the trap.
    PBC;
    eqDists = [];
    force = [];
    set(particle, ref_particle, stdev = 3.0, shape = -15, r0 = 1.2, PBC = 1) {
        this.particle = particle;
        this.ref_particle = ref_particle;
        this.stdev = stdev;
        this.shape = shape;
        this.r0 = r0;
        this.PBC = PBC;
        this.update();
    }
    equals(compareForce) {
        if (!(compareForce instanceof SkewTrap)) {
            return false;
        }
        return (this.particle === compareForce.particle &&
            this.ref_particle === compareForce.ref_particle &&
            this.stdev === compareForce.stdev &&
            this.shape === compareForce.shape &&
            this.r0 === compareForce.r0 &&
            this.PBC === compareForce.PBC);
    }
    setFromParsedJson(parsedjson) {
        for (var param in parsedjson) {
            if (['particle', 'ref_particle'].includes(param)) {
                this[param] = elements.get(parsedjson[param]);
            }
            else {
                this[param] = parsedjson[param];
            }
        }
        this.update();
    }
    toJSON() {
        return {
            type: this.type,
            particle: this.particle.id,
            ref_particle: this.ref_particle.id,
            stdev: this.stdev,
            shape: this.shape,
            r0: this.r0,
            PBC: this.PBC
        };
    }
    toString(idMap) {
        if (elements.has(this.particle.id) && elements.has(this.ref_particle.id)) {
            return (`{
    type = ${this.type}
    particle = ${idMap ? idMap.get(this.particle) : this.particle.id}
    ref_particle = ${idMap ? idMap.get(this.ref_particle) : this.ref_particle.id}
    stdev = ${this.stdev}
    shape = ${this.shape}
    r0 = ${this.r0}
    PBC = ${this.PBC}
}`);
        }
        else {
            notify(`${this.description()} includes a particle that no longer exists`, 'alert', true);
            return "";
        }
    }
    description() {
        return `Skew trap pulling ${this.particle.id} towards ${this.ref_particle.id}`;
    }
    update() {
        const p1 = this.particle.getInstanceParameter3("bbOffsets"); // position from which to exert the force.
        const p2 = this.ref_particle.getInstanceParameter3("bbOffsets"); // position to pull towards.
        let dir = p2.clone().sub(p1).normalize();
        this.eqDists = [
            p1, p1.clone().add(dir.clone().multiplyScalar(this.r0))
        ];
        //draw force
        dir = p2.clone().sub(p1);
        let force_v = dir.clone().normalize().multiplyScalar((dir.length() - this.r0) * this.stdev);
        dir.normalize();
        this.force = [
            p1, p1.clone().add(dir.multiplyScalar(force_v.length()))
        ];
    }
}
// Forces which can be drawn as a plane
class PlaneForce extends Force {
    equals(compareForce) {
        if (!(compareForce instanceof PlaneForce)) {
            return false;
        }
        return (this.particles === compareForce.particles &&
            this.dir === compareForce.dir &&
            this.position === compareForce.position &&
            this.stiff === compareForce.stiff);
    }
    set(particles, stiff = 0.09, position = 0, dir = new THREE.Vector3(0, 0, 1)) {
        this.particles = particles;
        this.stiff = stiff;
        this.dir = dir;
        this.position = position;
        this.update();
    }
    setFromParsedJson(parsedjson) {
        for (var param in parsedjson) {
            if (param === 'particle') {
                const particleData = parsedjson[param];
                if (Array.isArray(particleData)) {
                    this.particles = particleData.map(id => elements.get(id)).filter(p => p !== undefined);
                }
                else if (particleData === -1) {
                    this.particles = -1;
                }
                else {
                    const singleParticle = elements.get(particleData);
                    if (singleParticle === undefined) {
                        const err = `Particle ${particleData} in parsed force file does not exist.`;
                        notify(err, "alert");
                        throw (err);
                    }
                    this.particles = [singleParticle];
                }
            }
            else if (param === "dir") {
                const dirData = parsedjson[param];
                if (Array.isArray(dirData) && dirData.length === 3 && dirData.every(num => typeof num === 'number')) {
                    this.dir = new THREE.Vector3(...dirData);
                }
                else {
                    const err = `Invalid dir format: ${dirData}`;
                    notify(err, "alert");
                    throw (err);
                }
            }
            else {
                this[param] = parsedjson[param];
            }
        }
        this.update();
    }
    toJSON() {
        let particleData;
        particleData = Array.isArray(this.particles) ? this.particles.map(p => p.id) : this.particles;
        return {
            type: this.type,
            particle: particleData,
            stiff: this.stiff,
            dir: this.dir,
            position: this.position
        };
    }
    toString(idMap) {
        let particleRepresentation;
        if (Array.isArray(this.particles)) {
            particleRepresentation = this.particles.map(p => idMap ? idMap.get(p) : p.id).join(", ");
        }
        else {
            particleRepresentation = this.particles.toString();
        }
        return (`{
    type = ${this.type}
    particle = ${particleRepresentation}
    stiff = ${this.stiff}
    dir = ${this.dir}
    position = ${this.position}
}`);
    }
    description() {
        if (this.particles === -1) {
            return "Plane trap pulling particle all particles towards itself";
        }
        else {
            let particleRepresentation;
            if (Array.isArray(this.particles)) {
                particleRepresentation = this.particles.map(p => p.id).join(", ");
            }
            else {
                particleRepresentation = this.particles.toString();
            }
            return `Plane trap pulling particles ${particleRepresentation} towards itself`;
        }
    }
    update() {
        // plane position and orientation are persistent, so no need to update
    }
}
class RepulsionPlane extends PlaneForce {
    type = 'repulsion_plane';
    particles = -1; // Can be an array of particles or -1 (all)
    stiff; // stiffness of the harmonic repulsion potential.
    dir;
    position;
}
class AttractionPlane extends PlaneForce {
    type = 'attraction_plane';
    particles = -1; // Can be an array of particles or -1 (all)
    stiff; // stiffness of the harmonic repulsion potential and strength of the attractive force
    dir;
    position;
}
class RepulsiveSphere extends Force {
    constructor() {
      super();
      this.type = 'sphere';

      // oxDNA params
      this.particles = -1;         // -1 (all) or array<BasicElement>
      this.stiff = 10.0;           // harmonic stiffness (for display only; sim uses it)
      this.r0 = 6.0;               // initial radius
      this.rate = 0.0;             // growth per frame/step (viewer: per redraw tick)
      this.center = new THREE.Vector3(0, 0, 0);

      // viewer state
      this.currentRadius = this.r0;
      this.mesh = undefined;       // THREE.Mesh
      this.outline = undefined;    // THREE.LineSegments (optional, for edges)
    }

    set(particles, stiff = 10, r0 = 6, rate = 0, center = new THREE.Vector3(0,0,0)) {
      this.particles = particles;
      this.stiff = stiff;
      this.r0 = r0;
      this.rate = rate;
      this.center = center;
      this.currentRadius = r0;
      this.update();
    }

    setFromParsedJson(parsedjson) {
      for (const param in parsedjson) {
        if (param === 'particle') {
          const v = parsedjson[param];
          if (Array.isArray(v)) {
            this.particles = v.map(id => elements.get(id)).filter(p => p !== undefined);
          } else if (v === -1 || v === 'all') {
            this.particles = -1;
          } else {
            // allow single id or a "a-b" range string
            if (typeof v === 'string' && v.includes('-')) {
              const [a, b] = v.split('-').map(Number);
              const ids = [];
              for (let k = a; k <= b; k++) ids.push(k);
              this.particles = ids.map(id => elements.get(id)).filter(p => p !== undefined);
            } else {
              const el = elements.get(v);
              if (el === undefined) {
                const err = `Particle ${v} in parsed force file does not exist.`;
                notify(err, "alert");
                throw err;
              }
              this.particles = [el];
            }
          }
        } else if (param === 'center') {
          const c = parsedjson[param];
          this.center = new THREE.Vector3(c[0], c[1], c[2]);
        } else {
          this[param] = parsedjson[param];
        }
      }
      this.currentRadius = this.r0;
      this.update();
    }

    update() {
        // 1) Determine the current *frame index* in the viewer
        let step = 0;
        try {
          const sys = (typeof systems !== 'undefined' && systems.length > 0)
            ? systems[systems.length - 1]
            : undefined;
          const r = sys?.reader;
          step =
            (Number.isFinite(r?.confIndex) ? r.confIndex :
            Number.isFinite(r?.frameIndex) ? r.frameIndex :
            Number.isFinite(r?.current)    ? r.current    :
            Number.isFinite(r?.frame)      ? r.frame      :
            0);
        } catch (_) {}

        if (typeof window !== 'undefined' && Number.isFinite(window.currentFrameIndex)) {
          step = window.currentFrameIndex;
        }

        const stepsPerFrame = (typeof window !== "undefined" && window.currentSimTime !== undefined)
        ? window.currentSimTime
        : 0;

        this.currentRadius = this.r0 + this.rate * stepsPerFrame;
      }

    toJSON() {
      const particleData = Array.isArray(this.particles) ? this.particles.map(p => p.id) : this.particles;
      return {
        type: this.type,
        particle: particleData,
        stiff: this.stiff,
        r0: this.r0,
        rate: this.rate,
        center: [this.center.x, this.center.y, this.center.z],
      };
    }

    toString(idMap) {
      const particleRepresentation =
        Array.isArray(this.particles)
          ? this.particles.map(p => idMap ? idMap.get(p) : p.id).join(", ")
          : this.particles.toString();

      return (`{
      type = ${this.type}
      particle = ${particleRepresentation}
      center = ${this.center.x},${this.center.y},${this.center.z}
      stiff = ${this.stiff}
      rate = ${this.rate}
      r0 = ${this.r0}
  }`);
    }

    description() {
      const target =
        Array.isArray(this.particles)
          ? `${this.particles.length} particles`
          : (this.particles === -1 ? "all particles" : `${this.particles}`);
      return `Repulsive sphere @ ${this.center.toArray().map(n => Number(n).toFixed(2)).join(',')} on ${target}`;
    }
  }
class ForceHandler {
    types = [];
    knownTrapForces = ['mutual_trap', 'skew_trap']; //these are the forces I know how to draw via lines
    knownPlaneForces = ["repulsion_plane", "attraction_plane"]; //these are the forces I know how to draw via planes
    // inside class ForceHandler
    knownSphereForces = ['sphere'];         // NEW

    forceColors = [
        new THREE.Color(0x0000FF),
        new THREE.Color(0xFF0000),
    ];
    planeColors = [
        new THREE.Color(0x00FF00),
        new THREE.Color(0xFF00FF),
    ];
    sphereColors = [ new THREE.Color(0x00BFFF) ];
    sphereMeshes = [];                       // optional bookkeeping

    forceLines = [];
    eqDistLines;
    forcePlanes = [];
    forces = [];
    sceneObjects = [];
    forceTable;
    constructor() { }
    set(forces) {
        this.forces.push(...forces);
        try {
          if (this.sceneObjects.length > 0) {
            this.clearForcesFromScene();
          }
          this.drawTraps();
          this.drawPlanes();
          this.drawSpheres();          // NEW
        } catch (exceptionVar) {
          forces.forEach(_ => this.forces.pop());
          notify("Adding forces failed! See console for more information.", "alert");
          console.error(exceptionVar);
        }
      }

    removeByElement(elems, removePair = false) {
        // Get traps which contain the element
        const pairwiseForces = this.getTraps();
        let toRemove;
        if (removePair) {
            toRemove = new Set(pairwiseForces.filter(f => elems.includes(f.particle) || elems.includes(f.ref_particle)));
        }
        else {
            toRemove = new Set(pairwiseForces.filter(f => elems.includes(f.particle)));
        }
        if (toRemove.size == 0) {
            return;
        }
        // Remove the offending traps
        this.forces = this.forces.filter(f => !toRemove.has(f));
        listForces();
        this.clearForcesFromScene();
        if (this.forces.length > 0) {
            this.drawTraps();
        }
    }
    removeById(ids) {
        ids.forEach(i => {
            this.forces.splice(i, 1);
        });
        listForces();
        this.clearForcesFromScene();
        if (this.forces.length > 0) {
            this.drawTraps();
        }
    }
    getByElement(elems) {
        return this.getTraps().filter(f => elems.includes(f.particle));
    }
    getTraps() {
        return this.forces.filter(f => this.knownTrapForces.includes(f.type));
    }
    getPlanes() {
        return this.forces.filter(f => this.knownPlaneForces.includes(f.type));
    }
    clearForcesFromScene() {
        // Remove any old geometry (nothing happens if undefined)
        this.sceneObjects.forEach(o => scene.remove(o));
        render();
    }
    drawTraps() {
        // find out how many different types there are
        const traps = this.getTraps();
        this.types = Array.from((new Set(traps.map(trap => trap.type))));
        let v1 = [];
        let v2 = [];
        let forceGeoms = [];
        for (let i = 0; i < this.types.length; i++) {
            v1.push([]);
            forceGeoms.push(new THREE.BufferGeometry());
        }
        let eqDistGeom = new THREE.BufferGeometry();
        traps.forEach(f => {
            let idx = this.types.findIndex(t => t == f.type);
            v1[idx].push(f.force[0].x, f.force[0].y, f.force[0].z);
            v1[idx].push(f.force[1].x, f.force[1].y, f.force[1].z);
            v2.push(f.eqDists[0].x, f.eqDists[0].y, f.eqDists[0].z);
            v2.push(f.eqDists[1].x, f.eqDists[1].y, f.eqDists[1].z);
        });
        forceGeoms.forEach((g, i) => g.addAttribute('position', new THREE.Float32BufferAttribute(v1[i], 3)));
        let materials = this.types.map((t, i) => new THREE.LineBasicMaterial({ color: this.forceColors[i] }));
        this.forceLines = forceGeoms.map((g, i) => new THREE.LineSegments(g, materials[i]));
        this.forceLines.forEach(fl => {
            scene.add(fl);
            this.sceneObjects.push(fl);
        });
        eqDistGeom.addAttribute('position', new THREE.Float32BufferAttribute(v2, 3));
        materials[0] = new THREE.LineBasicMaterial({ color: 0x0000ff, opacity: .5 });
        this.eqDistLines = new THREE.LineSegments(eqDistGeom, materials[0]);
        scene.add(this.eqDistLines);
        this.sceneObjects.push(this.eqDistLines);
        render();
        //possibly a better way to fire update
        //trajReader.nextConfig = api.observable.wrap(trajReader.nextConfig, this.update);
        //trajReader.previousConfig = api.observable.wrap(trajReader.previousConfig, this.update);
    }
    drawPlanes() {
        const planes = this.getPlanes();
        planes.forEach(f => {
            let _extent = 512;
            let _color = this.planeColors[planes.indexOf(f) % this.planeColors.length];
            //  draw text on plane
            let ccanvas = document.createElement('canvas');
            let context = ccanvas.getContext('2d');
            ccanvas.width = _extent;
            ccanvas.height = _extent;
            context.fillStyle = '#' + _color.getHex().toString(16).padStart(6, '0');
            context.fillRect(0, 0, ccanvas.width, ccanvas.height);
            // text on plane
            context.font = '8px Arial';
            context.fillStyle = 'black'; // Text color
            context.textAlign = 'left'; // Align text to the right
            let _text = f.type + "\nposition: " + f.position + "\ndir: " + f.dir.x + " " + f.dir.y + " " + f.dir.z;
            // Split the text into lines and draw each line separately
            let lines = _text.split('\n');
            for (let i = 0; i < lines.length; i++) {
                context.fillText(lines[i], ccanvas.width - 70, ccanvas.height - 10 - (lines.length - 1 - i) * 10);
            }
            // Create plane from canvas
            let texture = new THREE.CanvasTexture(ccanvas);
            let geometry = new THREE.PlaneGeometry(_extent, _extent);
            let material = new THREE.MeshBasicMaterial({
                map: texture,
                side: THREE.DoubleSide,
                transparent: true,
                opacity: 0.5 // Set the desired opacity (0.0 to 1.0)
            });
            let plane = new THREE.Mesh(geometry, material);
            plane.lookAt(f.dir.clone());
            plane.position.set(-f.position * f.dir.x, -f.position * f.dir.y, -f.position * f.dir.z);
            scene.add(plane);
            this.sceneObjects.push(plane);
            this.forcePlanes.push(plane);
        });
    }
    redrawTraps() {
        if (this.forces.length == 0) {
            return;
        }
        let v1 = [];
        let v2 = [];
        for (let i = 0; i < this.types.length; i++) {
            v1.push([]);
        }
        this.getTraps().forEach(f => {
            f.update();
            let idx = this.types.findIndex(t => t == f.type);
            v1[idx].push(f.force[0].x, f.force[0].y, f.force[0].z);
            v1[idx].push(f.force[1].x, f.force[1].y, f.force[1].z);
            v2.push(f.eqDists[0].x, f.eqDists[0].y, f.eqDists[0].z);
            v2.push(f.eqDists[1].x, f.eqDists[1].y, f.eqDists[1].z);
        });
        this.types.forEach((t, i) => {
            for (let j = 0; j < v1[i].length; j++) {
                this.forceLines[i].geometry["attributes"]["position"].array[j] = v1[i][j];
            }
            this.forceLines[i].geometry["attributes"]['position'].needsUpdate = true;
        });
        for (let i = 0; i < v2.length; i++) {
            this.eqDistLines.geometry["attributes"]['position'].array[i] = v2[i];
        }
        this.eqDistLines.geometry["attributes"]['position'].needsUpdate = true;
        render();
        this.redrawSpheres();
    }
    getSpheres() {
        return this.forces.filter(f => this.knownSphereForces.includes(f.type));
      }
      drawSpheres() {
        const spheres = this.getSpheres();
        spheres.forEach(f => {
          // Ensure currentRadius is up-to-date before first draw
          f.update();
          const seg = 32;
          const geom = new THREE.SphereGeometry(Math.max(f.currentRadius, 0.0001), seg, seg);
          const color = this.sphereColors[spheres.indexOf(f) % this.sphereColors.length];
          const mat = new THREE.MeshPhongMaterial({ transparent: true, opacity: 0.25, color, side: THREE.DoubleSide });

          const mesh = new THREE.Mesh(geom, mat);
          mesh.position.copy(f.center);

          // optional edge outline to improve visibility
          const edges = new THREE.EdgesGeometry(geom);
          const line = new THREE.LineSegments(edges, new THREE.LineBasicMaterial({ color }));
          line.position.copy(f.center);

          scene.add(mesh);
          scene.add(line);

          f.mesh = mesh;
          f.outline = line;

          // Remember the radius the geometry was BUILT with.
          // We'll scale to currentRadius / _baseRadius on every redraw.
          f._baseRadius = f.currentRadius;
          // Ensure initial scale is 1
          f.mesh.scale.set(1, 1, 1);
          if (f.outline) f.outline.scale.set(1, 1, 1);

          this.sceneObjects.push(mesh, line);
          this.sphereMeshes.push(mesh);
        });
      }

      redrawSpheres() {
        const spheres = this.getSpheres();
        if (spheres.length === 0) return;

        spheres.forEach(f => {
          f.update();
          if (!f.mesh) return;

          // Absolute scale so visual radius = currentRadius
          const base = Math.max(f._baseRadius || 1, 1e-6);
          const s = Math.max(f.currentRadius, 1e-6) / base;
          f.mesh.scale.set(s, s, s);
          if (f.outline) f.outline.scale.set(s, s, s);

        });

        render();
      }


}
function makeTrapsFromSelection() {
    let stiffness = parseFloat(document.getElementById("txtForceValue").value);
    let r0 = parseFloat(document.getElementById('r0').value);
    let selection = Array.from(selectedBases);
    const forces = [];
    // For every other element in selection
    for (let i = 0; i < selection.length; i += 2) {
        // If there is another nucleotide in the pair
        if (selection[i + 1] !== undefined) {
            //create mutual trap data for the 2 nucleotides in a pair - selected simultaneously
            let trapA = new MutualTrap();
            trapA.set(selection[i], selection[i + 1], stiffness, r0);
            forces.push(trapA);
            let trapB = new MutualTrap();
            trapB.set(selection[i + 1], selection[i], stiffness, r0);
            forces.push(trapB);
        }
        else {
            //if there is no 2nd nucleotide in the pair
            notify("The last selected base does not have a pair and thus cannot be included in the Mutual Trap File."); //give error message
        }
    }
    forceHandler.set(forces);
}
function makeTrapsFromPairs() {
    let stiffness = parseFloat(document.getElementById("txtForceValue").value);
    let nopairs = !systems.every(sys => sys.checkedForBasepairs);
    if (nopairs) {
        ask("No basepair info found", "Do you want to run an automatic basepair search?", () => { view.longCalculation(findBasepairs, view.basepairMessage, makeTrapsFromPairs); });
    }
    const forces = [];
    elements.forEach(e => {
        // If element is paired and the trap doesn't already exist, add a trap
        if (e.isPaired()) {
            const currForces = forceHandler.getByElement([e]);
            let trap = new MutualTrap();
            trap.set(e, e.pair, stiffness);
            const alreadyExists = currForces.filter(f => f.equals(trap));
            if (alreadyExists.length === 0) {
                forces.push(trap);
            }
        }
    });
    forceHandler.set(forces);
    listForces();
}
