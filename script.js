// Body class with realistic physics
class Body {
  constructor(x,y,z,vx,vy,vz,radius,mass,color,name){
    this.pos=[x,y,z]; 
    this.vel=[vx,vy,vz]; 
    this.acc=[0,0,0];
    this.radius=radius; 
    this.mass=mass;
    this.color=color;
    this.name=name;
  }
  
  applyForce(fx,fy,fz){
    this.acc[0]+=fx/this.mass;
    this.acc[1]+=fy/this.mass;
    this.acc[2]+=fz/this.mass;
  }
  
  update(dt){ 
    this.vel[0]+=this.acc[0]*dt;
    this.vel[1]+=this.acc[1]*dt;
    this.vel[2]+=this.acc[2]*dt;
    
    this.pos[0]+=this.vel[0]*dt; 
    this.pos[1]+=this.vel[1]*dt; 
    this.pos[2]+=this.vel[2]*dt;
    
    this.acc=[0,0,0];
  }
}

// Realistic planetary system with gravity constant
const G = 0.5; // Gravitational constant (scaled for visualization)

let bodies = [
  new Body(0, 0, 0, 0, 0, 0, 15, 1000, 0xffff00, "Sun"),
  new Body(50, 0, 0, 0, 0, 1.4, 6, 1, 0x00bfff, "Earth"),
  new Body(0, 80, 0, 1.1, 0, 0, 5, 0.8, 0xff6b6b, "Mars"),
  new Body(-70, 0, 0, 0, 0, -1.2, 5.5, 0.9, 0xffa500, "Venus"),
  new Body(40, 0, 40, -0.8, 0, 0.8, 4, 0.6, 0x8b7355, "Mercury"),
  new Body(0, -120, 0, 1.5, 0, 0, 12, 10, 0xdaa520, "Jupiter")
];

// Store initial state for reset
let initialBodies = JSON.parse(JSON.stringify(bodies.map(b => ({
  pos: [...b.pos],
  vel: [...b.vel],
  radius: b.radius,
  mass: b.mass,
  color: b.color,
  name: b.name
}))));

// Apply gravitational forces
function applyGravity(){
  for(let i=0; i<bodies.length; i++){
    for(let j=i+1; j<bodies.length; j++){
      let dx=bodies[j].pos[0]-bodies[i].pos[0];
      let dy=bodies[j].pos[1]-bodies[i].pos[1];
      let dz=bodies[j].pos[2]-bodies[i].pos[2];
      let distSq=dx*dx+dy*dy+dz*dz;
      let dist=Math.sqrt(distSq);
      
      // Handle collisions
      if(dist<bodies[i].radius+bodies[j].radius && collisionsEnabled){
        handleCollision(i, j);
        continue;
      }
      
      let force=G*bodies[i].mass*bodies[j].mass/distSq;
      let fx=force*dx/dist;
      let fy=force*dy/dist;
      let fz=force*dz/dist;
      
      bodies[i].applyForce(fx,fy,fz);
      bodies[j].applyForce(-fx,-fy,-fz);
    }
  }
}

// Handle collisions between bodies
function handleCollision(i, j){
  // Merge bodies (larger absorbs smaller)
  if(bodies[i].mass >= bodies[j].mass){
    mergeBody(i, j);
  } else {
    mergeBody(j, i);
  }
}

function mergeBody(absorber, absorbed){
  const b1 = bodies[absorber];
  const b2 = bodies[absorbed];
  
  // Conservation of momentum
  const totalMass = b1.mass + b2.mass;
  b1.vel[0] = (b1.mass * b1.vel[0] + b2.mass * b2.vel[0]) / totalMass;
  b1.vel[1] = (b1.mass * b1.vel[1] + b2.mass * b2.vel[1]) / totalMass;
  b1.vel[2] = (b1.mass * b1.vel[2] + b2.mass * b2.vel[2]) / totalMass;
  
  // Increase mass and radius
  b1.mass = totalMass;
  b1.radius = Math.cbrt((b1.radius**3 + b2.radius**3));
  
  // Update mesh
  scene.remove(meshes[absorber]);
  const geo = new THREE.SphereGeometry(b1.radius, 64, 64);
  const mat = new THREE.MeshStandardMaterial({
    color: b1.color,
    emissive: b1.mass > 100 ? b1.color : 0x000000,
    emissiveIntensity: b1.mass > 100 ? 0.8 : 0,
    metalness: 0.3,
    roughness: 0.7
  });
  meshes[absorber] = new THREE.Mesh(geo, mat);
  meshes[absorber].position.set(...b1.pos);
  meshes[absorber].castShadow = true;
  meshes[absorber].receiveShadow = true;
  scene.add(meshes[absorber]);
  
  // Remove absorbed body
  removeBody(absorbed);
}

function removeBody(index){
  scene.remove(meshes[index]);
  scene.remove(trailLines[index]);
  scene.remove(labelSprites[index]);
  scene.remove(velocityArrows[index]);
  
  bodies.splice(index, 1);
  meshes.splice(index, 1);
  trailLines.splice(index, 1);
  trailPoints.splice(index, 1);
  labelSprites.splice(index, 1);
  velocityArrows.splice(index, 1);
  
  if(followBody !== null && followBody >= index){
    followBody = followBody === index ? null : followBody - 1;
  }
  
  updateBodySelector();
  updateStats();
}

// THREE.JS setup
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x000000);

const camera = new THREE.PerspectiveCamera(75, window.innerWidth/window.innerHeight, 0.1, 1000);
camera.position.set(100, 80, 100);
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer({antialias: true});
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.appendChild(renderer.domElement);

// Add lighting for 3D effect
const ambientLight = new THREE.AmbientLight(0x404040, 0.6);
scene.add(ambientLight);

const pointLight = new THREE.PointLight(0xffffff, 1.5, 400);
pointLight.position.set(0, 0, 0);
pointLight.castShadow = true;
scene.add(pointLight);

// Create sphere meshes with proper 3D materials
let meshes = [];
bodies.forEach(b=>{
  let geo = new THREE.SphereGeometry(b.radius, 64, 64);
  let mat = new THREE.MeshStandardMaterial({
    color: b.color,
    emissive: b.mass > 100 ? b.color : 0x000000,
    emissiveIntensity: b.mass > 100 ? 0.8 : 0,
    metalness: 0.3,
    roughness: 0.7
  });
  let mesh = new THREE.Mesh(geo, mat);
  mesh.position.set(...b.pos);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  scene.add(mesh);
  meshes.push(mesh);
});

// Add orbit trails
let trailPoints = bodies.map(() => []);
let trailLines = [];
bodies.forEach((b, i) => {
  const geometry = new THREE.BufferGeometry();
  const material = new THREE.LineBasicMaterial({ 
    color: b.color, 
    opacity: 0.4, 
    transparent: true,
    linewidth: 2
  });
  const line = new THREE.Line(geometry, material);
  scene.add(line);
  trailLines.push(line);
});

// Add grid helper
const gridHelper = new THREE.GridHelper(300, 30, 0x444444, 0x222222);
gridHelper.visible = false;
scene.add(gridHelper);

// Add axis helper
const axesHelper = new THREE.AxesHelper(150);
axesHelper.visible = false;
scene.add(axesHelper);

// Add starfield background
const starGeometry = new THREE.BufferGeometry();
const starVertices = [];
for(let i=0; i<3000; i++){
  const x = (Math.random()-0.5)*1000;
  const y = (Math.random()-0.5)*1000;
  const z = (Math.random()-0.5)*1000;
  starVertices.push(x,y,z);
}
starGeometry.setAttribute('position', new THREE.Float32BufferAttribute(starVertices, 3));
const starMaterial = new THREE.PointsMaterial({color: 0xffffff, size: 0.7});
const stars = new THREE.Points(starGeometry, starMaterial);
scene.add(stars);

// Label sprites
function createLabelSprite(text, color) {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  canvas.width = 256;
  canvas.height = 64;
  
  ctx.fillStyle = color;
  ctx.font = 'bold 28px Arial';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, canvas.width/2, canvas.height/2);
  
  const texture = new THREE.CanvasTexture(canvas);
  const spriteMaterial = new THREE.SpriteMaterial({map: texture, transparent: true});
  const sprite = new THREE.Sprite(spriteMaterial);
  sprite.scale.set(20, 5, 1);
  
  return sprite;
}

let labelSprites = [];
bodies.forEach((b, i) => {
  const sprite = createLabelSprite(b.name, 'white');
  sprite.position.set(b.pos[0], b.pos[1] + b.radius + 8, b.pos[2]);
  scene.add(sprite);
  labelSprites.push(sprite);
});

// Velocity vectors
let velocityArrows = [];
bodies.forEach((b, i) => {
  const dir = new THREE.Vector3(...b.vel).normalize();
  const origin = new THREE.Vector3(...b.pos);
  const length = Math.sqrt(b.vel[0]**2 + b.vel[1]**2 + b.vel[2]**2);
  const arrow = new THREE.ArrowHelper(dir, origin, length * 5, b.color, 3, 2);
  arrow.visible = false;
  scene.add(arrow);
  velocityArrows.push(arrow);
});

// Control variables
let isPaused = false;
let timeSpeed = 1.0;
let showTrails = true;
let showLabels = true;
let followBody = null;
let showVectors = false;
let collisionsEnabled = false;

// Mouse controls for camera rotation
let isDragging = false;
let previousMousePosition = { x: 0, y: 0 };
let cameraRotation = { theta: Math.PI / 4, phi: Math.PI / 6 };
let cameraDistance = 150;

renderer.domElement.addEventListener('mousedown', (e) => {
  isDragging = true;
  previousMousePosition = { x: e.clientX, y: e.clientY };
});

renderer.domElement.addEventListener('mousemove', (e) => {
  if (isDragging) {
    const deltaX = e.clientX - previousMousePosition.x;
    const deltaY = e.clientY - previousMousePosition.y;
    
    cameraRotation.theta -= deltaX * 0.01;
    cameraRotation.phi -= deltaY * 0.01;
    cameraRotation.phi = Math.max(0.1, Math.min(Math.PI - 0.1, cameraRotation.phi));
    
    previousMousePosition = { x: e.clientX, y: e.clientY };
  }
});

renderer.domElement.addEventListener('mouseup', () => {
  isDragging = false;
});

renderer.domElement.addEventListener('mouseleave', () => {
  isDragging = false;
});

renderer.domElement.addEventListener('wheel', (e) => {
  e.preventDefault();
  cameraDistance += e.deltaY * 0.1;
  cameraDistance = Math.max(50, Math.min(400, cameraDistance));
});

// UI controls
document.getElementById('speedSlider').addEventListener('input', (e) => {
  timeSpeed = parseFloat(e.target.value);
  document.getElementById('speedValue').textContent = timeSpeed.toFixed(1);
});

document.getElementById('trailsToggle').addEventListener('change', (e) => {
  showTrails = e.target.checked;
  trailLines.forEach(line => line.visible = showTrails);
});

document.getElementById('labelsToggle').addEventListener('change', (e) => {
  showLabels = e.target.checked;
  labelSprites.forEach(sprite => sprite.visible = showLabels);
});

document.getElementById('gridToggle').addEventListener('change', (e) => {
  gridHelper.visible = e.target.checked;
  axesHelper.visible = e.target.checked;
});

document.getElementById('vectorsToggle').addEventListener('change', (e) => {
  showVectors = e.target.checked;
  velocityArrows.forEach(arrow => arrow.visible = showVectors);
});

document.getElementById('collisionsToggle').addEventListener('change', (e) => {
  collisionsEnabled = e.target.checked;
});

document.getElementById('followSelect').addEventListener('change', (e) => {
  const index = parseInt(e.target.value);
  followBody = index >= 0 ? index : null;
});

document.getElementById('addPlanet').addEventListener('click', () => {
  addRandomBody();
});

document.getElementById('clearTrails').addEventListener('click', () => {
  trailPoints.forEach(trail => trail.length = 0);
});

// Update body selector
function updateBodySelector(){
  const select = document.getElementById('followSelect');
  const currentValue = select.value;
  select.innerHTML = '<option value="-1">Free Camera</option>';
  bodies.forEach((b, i) => {
    const option = document.createElement('option');
    option.value = i;
    option.textContent = b.name;
    if(i.toString() === currentValue) option.selected = true;
    select.appendChild(option);
  });
}
updateBodySelector();

// Update statistics
function updateStats(){
  document.getElementById('bodyCount').textContent = bodies.length;
  const totalMass = bodies.reduce((sum, b) => sum + b.mass, 0);
  document.getElementById('totalMass').textContent = totalMass.toFixed(1);
}
updateStats();

// Add random body
function addRandomBody(){
  const angle = Math.random() * Math.PI * 2;
  const distance = 60 + Math.random() * 80;
  const x = Math.cos(angle) * distance;
  const z = Math.sin(angle) * distance;
  const y = (Math.random() - 0.5) * 40;
  
  const speed = Math.sqrt(G * bodies[0].mass / distance) * (0.7 + Math.random() * 0.3);
  const vx = -Math.sin(angle) * speed;
  const vz = Math.cos(angle) * speed;
  const vy = (Math.random() - 0.5) * 0.5;
  
  const radius = 3 + Math.random() * 4;
  const mass = radius / 6;
  const color = Math.random() * 0xffffff;
  const name = `Body ${bodies.length}`;
  
  const newBody = new Body(x, y, z, vx, vy, vz, radius, mass, color, name);
  bodies.push(newBody);
  
  // Create mesh
  const geo = new THREE.SphereGeometry(radius, 64, 64);
  const mat = new THREE.MeshStandardMaterial({
    color: color,
    metalness: 0.3,
    roughness: 0.7
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.set(x, y, z);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  scene.add(mesh);
  meshes.push(mesh);
  
  // Create trail
  const trailGeo = new THREE.BufferGeometry();
  const trailMat = new THREE.LineBasicMaterial({ 
    color: color, 
    opacity: 0.4, 
    transparent: true,
    linewidth: 2
  });
  const line = new THREE.Line(trailGeo, trailMat);
  line.visible = showTrails;
  scene.add(line);
  trailLines.push(line);
  trailPoints.push([]);
  
  // Create label
  const sprite = createLabelSprite(name, 'white');
  sprite.position.set(x, y + radius + 8, z);
  sprite.visible = showLabels;
  scene.add(sprite);
  labelSprites.push(sprite);
  
  // Create velocity arrow
  const dir = new THREE.Vector3(vx, vy, vz).normalize();
  const origin = new THREE.Vector3(x, y, z);
  const velMag = Math.sqrt(vx*vx + vy*vy + vz*vz);
  const arrow = new THREE.ArrowHelper(dir, origin, velMag * 5, color, 3, 2);
  arrow.visible = showVectors;
  scene.add(arrow);
  velocityArrows.push(arrow);
  
  updateBodySelector();
  updateStats();
}

// Keyboard controls
document.addEventListener('keydown', (e) => {
  if(e.code === 'Space'){
    e.preventDefault();
    isPaused = !isPaused;
    document.getElementById('status').textContent = isPaused ? 'Paused' : 'Running';
  }
  if(e.code === 'KeyR'){
    // Reset simulation
    scene.clear();
    meshes = [];
    trailLines = [];
    trailPoints = [];
    labelSprites = [];
    velocityArrows = [];
    
    // Recreate initial bodies
    bodies = initialBodies.map(ib => 
      new Body(ib.pos[0], ib.pos[1], ib.pos[2], 
               ib.vel[0], ib.vel[1], ib.vel[2],
               ib.radius, ib.mass, ib.color, ib.name)
    );
    
    // Re-add lights
    scene.add(ambientLight);
    scene.add(pointLight);
    scene.add(gridHelper);
    scene.add(axesHelper);
    scene.add(stars);
    
    // Recreate all objects
    bodies.forEach((b, i) => {
      // Mesh
      const geo = new THREE.SphereGeometry(b.radius, 64, 64);
      const mat = new THREE.MeshStandardMaterial({
        color: b.color,
        emissive: b.mass > 100 ? b.color : 0x000000,
        emissiveIntensity: b.mass > 100 ? 0.8 : 0,
        metalness: 0.3,
        roughness: 0.7
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(...b.pos);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      scene.add(mesh);
      meshes.push(mesh);
      
      // Trail
      const trailGeo = new THREE.BufferGeometry();
      const trailMat = new THREE.LineBasicMaterial({ 
        color: b.color, 
        opacity: 0.4, 
        transparent: true
      });
      const line = new THREE.Line(trailGeo, trailMat);
      line.visible = showTrails;
      scene.add(line);
      trailLines.push(line);
      trailPoints.push([]);
      
      // Label
      const sprite = createLabelSprite(b.name, 'white');
      sprite.position.set(b.pos[0], b.pos[1] + b.radius + 8, b.pos[2]);
      sprite.visible = showLabels;
      scene.add(sprite);
      labelSprites.push(sprite);
      
      // Arrow
      const dir = new THREE.Vector3(...b.vel).normalize();
      const origin = new THREE.Vector3(...b.pos);
      const length = Math.sqrt(b.vel[0]**2 + b.vel[1]**2 + b.vel[2]**2);
      const arrow = new THREE.ArrowHelper(dir, origin, length * 5, b.color, 3, 2);
      arrow.visible = showVectors;
      scene.add(arrow);
      velocityArrows.push(arrow);
    });
    
    followBody = null;
    updateBodySelector();
    updateStats();
  }
});

// Animation loop
function animate(){
  requestAnimationFrame(animate);
  
  if(!isPaused){
    // Apply gravitational forces
    applyGravity();
    
    // Update bodies
    bodies.forEach((b,i)=>{
      b.update(0.16 * timeSpeed);
      meshes[i].position.set(...b.pos);
      
      // Update labels
      labelSprites[i].position.set(b.pos[0], b.pos[1] + b.radius + 8, b.pos[2]);
      
      // Update velocity vectors
      const velMag = Math.sqrt(b.vel[0]**2 + b.vel[1]**2 + b.vel[2]**2);
      if(velMag > 0.001){
        const dir = new THREE.Vector3(...b.vel).normalize();
        velocityArrows[i].setDirection(dir);
        velocityArrows[i].setLength(velMag * 5, 3, 2);
        velocityArrows[i].position.set(...b.pos);
      }
      
      // Update trails (skip sun)
      if(i > 0){
        trailPoints[i].push(new THREE.Vector3(...b.pos));
        if (trailPoints[i].length > 300) trailPoints[i].shift();
        
        if(trailPoints[i].length > 1){
          const positions = new Float32Array(trailPoints[i].length * 3);
          trailPoints[i].forEach((p, idx) => {
            positions[idx * 3] = p.x;
            positions[idx * 3 + 1] = p.y;
            positions[idx * 3 + 2] = p.z;
          });
          trailLines[i].geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        }
      }
    });
  }
  
  // Update camera position
  if(followBody !== null && followBody < bodies.length){
    const target = bodies[followBody].pos;
    camera.position.x = target[0] + cameraDistance * Math.sin(cameraRotation.phi) * Math.cos(cameraRotation.theta);
    camera.position.y = target[1] + cameraDistance * Math.cos(cameraRotation.phi);
    camera.position.z = target[2] + cameraDistance * Math.sin(cameraRotation.phi) * Math.sin(cameraRotation.theta);
    camera.lookAt(target[0], target[1], target[2]);
  } else {
    camera.position.x = cameraDistance * Math.sin(cameraRotation.phi) * Math.cos(cameraRotation.theta);
    camera.position.y = cameraDistance * Math.cos(cameraRotation.phi);
    camera.position.z = cameraDistance * Math.sin(cameraRotation.phi) * Math.sin(cameraRotation.theta);
    camera.lookAt(0, 0, 0);
  }
  
  renderer.render(scene, camera);
}
animate();

// Window resize handler
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});