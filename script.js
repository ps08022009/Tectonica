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
const initialBodies = JSON.parse(JSON.stringify(bodies.map(b => ({
  pos: [...b.pos],
  vel: [...b.vel]
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
      
      if(dist<bodies[i].radius+bodies[j].radius) continue;
      
      let force=G*bodies[i].mass*bodies[j].mass/distSq;
      let fx=force*dx/dist;
      let fy=force*dy/dist;
      let fz=force*dz/dist;
      
      bodies[i].applyForce(fx,fy,fz);
      bodies[j].applyForce(-fx,-fy,-fz);
    }
  }
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

// Add grid helper (optional)
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

// Control variables
let isPaused = false;
let timeSpeed = 1.0;
let showTrails = true;
let showLabels = true;

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

// Keyboard controls
document.addEventListener('keydown', (e) => {
  if(e.code === 'Space'){
    e.preventDefault();
    isPaused = !isPaused;
    document.getElementById('status').textContent = isPaused ? 'Paused' : 'Running';
  }
  if(e.code === 'KeyR'){
    // Reset simulation
    bodies.forEach((b, i) => {
      b.pos = [...initialBodies[i].pos];
      b.vel = [...initialBodies[i].vel];
      b.acc = [0,0,0];
    });
    trailPoints.forEach(trail => trail.length = 0);
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
  camera.position.x = cameraDistance * Math.sin(cameraRotation.phi) * Math.cos(cameraRotation.theta);
  camera.position.y = cameraDistance * Math.cos(cameraRotation.phi);
  camera.position.z = cameraDistance * Math.sin(cameraRotation.phi) * Math.sin(cameraRotation.theta);
  camera.lookAt(0, 0, 0);
  
  renderer.render(scene, camera);
}
animate();

// Window resize handler
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});