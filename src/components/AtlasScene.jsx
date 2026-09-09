import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { SYSTEMS, SYSTEM_MAP, remoteModelUrl } from '../data/anatomy.js'

function createExplosionLayout(parts, aspect = 1) {
  const cards = parts.map((part) => ({
    id: part.id,
    width: Math.max(0.035, part.bounds[1][0] - part.bounds[0][0]) + 0.035,
    height: Math.max(0.035, part.bounds[1][1] - part.bounds[0][1]) + 0.035,
  }))
  const area = cards.reduce((sum, card) => sum + card.width * card.height, 0)
  const maxWidth = Math.max(0.3, ...cards.map((card) => card.width))
  const targetWidth = Math.max(maxWidth, Math.sqrt(area * Math.max(0.55, Math.min(1.6, aspect))) * 1.16)
  cards.sort((a, b) => b.height - a.height || a.id.localeCompare(b.id))
  const cells = new Map()
  let x = 0
  let y = 0
  let rowHeight = 0
  let usedWidth = 0
  for (const card of cards) {
    if (x > 0 && x + card.width > targetWidth) {
      x = 0
      y += rowHeight
      rowHeight = 0
    }
    cells.set(card.id, { x: x + card.width / 2, y: -y - card.height / 2 })
    x += card.width
    usedWidth = Math.max(usedWidth, x)
    rowHeight = Math.max(rowHeight, card.height)
  }
  const height = y + rowHeight
  for (const cell of cells.values()) {
    cell.x -= usedWidth / 2
    cell.y += height / 2
  }
  return { cells, width: usedWidth, height }
}

async function decodeModelResponse(response, expectedBytes, compressed) {
  if (!response.ok) throw new Error(`An anatomy model chunk could not be loaded (${response.status}).`)
  const payload = await response.arrayBuffer()
  const sig = new Uint8Array(payload, 0, Math.min(2, payload.byteLength))
  const gzipPayload = compressed && sig[0] === 0x1f && sig[1] === 0x8b
  let buffer = payload
  if (gzipPayload) {
    if (typeof DecompressionStream === 'undefined') throw new Error('This browser cannot decompress the anatomy model. Try a current Chrome, Edge, Safari, or Firefox release.')
    buffer = await new Response(new Blob([payload]).stream().pipeThrough(new DecompressionStream('gzip'))).arrayBuffer()
  }
  if (buffer.byteLength !== expectedBytes) throw new Error('An anatomy file was incomplete. Reload the viewer and try again.')
  return buffer
}

function setView(camera, controls, view, explode, layoutSize, host) {
  const dirs = {
    front: new THREE.Vector3(0, 0.015, 1),
    back: new THREE.Vector3(0, 0.015, -1),
    side: new THREE.Vector3(1, 0.015, 0),
    'three-quarter': new THREE.Vector3(0.38, 0.05, 1).normalize(),
  }
  const mobile = host.clientWidth < 760
  const baseDistance = mobile ? 4.6 : 3.75
  let distance = baseDistance
  let targetY = 0.86
  if (explode > 0.58 && layoutSize.width > 0) {
    const fov = THREE.MathUtils.degToRad(camera.fov)
    const byHeight = layoutSize.height / (2 * Math.tan(fov / 2))
    const byWidth = layoutSize.width / Math.max(0.35, camera.aspect) / (2 * Math.tan(fov / 2))
    distance = Math.max(baseDistance, Math.max(byHeight, byWidth) * 1.12)
    targetY = 0.86
    view = 'front'
  }
  const direction = dirs[view] || dirs['three-quarter']
  controls.target.set(0, targetY, 0)
  camera.position.copy(controls.target).addScaledVector(direction, distance)
  controls.update()
}

export default function AtlasScene({ atlas, state, onSelect, onProgress, onError }) {
  const hostRef = useRef(null)
  const latestState = useRef(state)
  const latestSelect = useRef(onSelect)
  latestState.current = state
  latestSelect.current = onSelect

  useEffect(() => {
    const host = hostRef.current
    if (!host || !atlas) return undefined

    let disposed = false
    let animationFrame = 0
    let loadedChunks = 0
    let ready = false
    let lastStateRef = null
    let lastReset = -1
    let lastView = ''
    let currentExplode = 0
    let layoutKey = ''
    let layoutSize = { width: 0, height: 0 }
    const abortController = new AbortController()

    let renderer
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' })
    } catch {
      onError?.('WebGL could not start. Use a modern browser with hardware acceleration enabled.')
      return undefined
    }

    renderer.outputColorSpace = THREE.SRGBColorSpace
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.toneMappingExposure = 1.08
    renderer.setClearColor(0xeff2f1, 1)
    renderer.domElement.className = 'atlas-canvas'
    renderer.domElement.setAttribute('aria-label', 'Interactive 3D human anatomy. Drag to orbit, scroll or pinch to zoom, and click a structure to inspect it.')
    host.appendChild(renderer.domElement)

    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(34, 1, 0.005, 100)
    const controls = new OrbitControls(camera, renderer.domElement)
    controls.enableDamping = true
    controls.dampingFactor = 0.075
    controls.minDistance = 0.12
    controls.maxDistance = 40
    controls.maxPolarAngle = Math.PI * 0.97
    controls.autoRotateSpeed = 0.7

    const pmrem = new THREE.PMREMGenerator(renderer)
    const room = new RoomEnvironment()
    const env = pmrem.fromScene(room, 0.04)
    scene.environment = env.texture
    room.dispose()
    pmrem.dispose()

    scene.add(new THREE.HemisphereLight(0xffffff, 0xa8afb2, 1.05))
    const keyLight = new THREE.DirectionalLight(0xfffaf5, 2.35)
    keyLight.position.set(-2.2, 4.1, 3.2)
    scene.add(keyLight)
    const rimLight = new THREE.DirectionalLight(0xe7f0ff, 1.6)
    rimLight.position.set(2.5, 2.2, -3)
    scene.add(rimLight)

    const stageMaterial = new THREE.MeshStandardMaterial({ color: 0xe7e9e7, roughness: 0.82, metalness: 0.04 })
    const platform = new THREE.Mesh(new THREE.CylinderGeometry(0.72, 0.74, 0.026, 96), stageMaterial)
    platform.position.y = -0.018
    scene.add(platform)
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(0.62, 0.624, 128),
      new THREE.MeshBasicMaterial({ color: 0x8c969f, transparent: true, opacity: 0.35, side: THREE.DoubleSide }),
    )
    ring.rotation.x = -Math.PI / 2
    ring.position.y = 0.001
    scene.add(ring)

    const textureWidth = THREE.MathUtils.ceilPowerOfTwo(atlas.parts.length)
    const partStateData = new Float32Array(textureWidth * 4)
    const partStateTexture = new THREE.DataTexture(partStateData, textureWidth, 1, THREE.RGBAFormat, THREE.FloatType)
    partStateTexture.needsUpdate = true
    const selectionData = new Uint8Array(textureWidth * 4)
    const selectionTexture = new THREE.DataTexture(selectionData, textureWidth, 1, THREE.RGBAFormat, THREE.UnsignedByteType)
    selectionTexture.needsUpdate = true

    const geometries = []
    const materials = []
    const pickers = new Array(atlas.parts.length)
    const centers = atlas.parts.map((part) => new THREE.Vector3().fromArray(part.bounds[0]).add(new THREE.Vector3().fromArray(part.bounds[1])).multiplyScalar(0.5))
    const bounds = atlas.parts.map((part) => new THREE.Box3(new THREE.Vector3().fromArray(part.bounds[0]), new THREE.Vector3().fromArray(part.bounds[1])))
    const offsets = atlas.parts.map(() => new THREE.Vector3())

    const materialFor = (systemId) => {
      const system = SYSTEM_MAP[systemId]
      const material = new THREE.MeshStandardMaterial({
        color: system?.color || '#aebbb8',
        metalness: 0.07,
        roughness: 0.54,
        side: THREE.DoubleSide,
        transparent: systemId === 'integumentary',
        opacity: systemId === 'integumentary' ? 0.11 : 1,
        depthWrite: systemId !== 'integumentary',
      })
      material.onBeforeCompile = (shader) => {
        shader.uniforms.partState = { value: partStateTexture }
        shader.uniforms.selectionState = { value: selectionTexture }
        shader.uniforms.stateWidth = { value: textureWidth }
        shader.uniforms.pulseTime = { value: 0 }
        material.userData.shader = shader
        shader.vertexShader = `attribute float partIndex; uniform sampler2D partState; uniform sampler2D selectionState; uniform float stateWidth; varying float partVisible; varying vec2 partHighlight;\n${shader.vertexShader}`
        shader.vertexShader = shader.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\nvec2 stateUv = vec2((partIndex + 0.5) / stateWidth, 0.5);\nvec4 state = texture2D(partState, stateUv);\ntransformed += state.xyz;\npartVisible = state.w;\npartHighlight = texture2D(selectionState, stateUv).rg;')
        shader.fragmentShader = `uniform float pulseTime; varying float partVisible; varying vec2 partHighlight;\n${shader.fragmentShader}`
        shader.fragmentShader = shader.fragmentShader.replace('#include <clipping_planes_fragment>', '#include <clipping_planes_fragment>\nif (partVisible < 0.5) discard;')
        shader.fragmentShader = shader.fragmentShader.replace('#include <color_fragment>', '#include <color_fragment>\ndiffuseColor.rgb = mix(diffuseColor.rgb, vec3(1.0, 0.78, 0.08), partHighlight.g * (0.48 + 0.42 * (0.5 + 0.5 * sin(pulseTime * 2.15))));\ndiffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.20, 0.72, 0.67), partHighlight.r * 0.82);')
      }
      materials.push(material)
      return material
    }

    const materialMap = new Map(SYSTEMS.map((system) => [system.id, materialFor(system.id)]))

    const loadChunk = async (chunkIndex) => {
      const chunk = atlas.chunks[chunkIndex]
      const canGzip = Boolean(chunk.gzip && typeof DecompressionStream !== 'undefined')
      const response = await fetch(remoteModelUrl(canGzip ? chunk.gzip : chunk.url), { signal: abortController.signal })
      const buffer = await decodeModelResponse(response, chunk.bytes, canGzip)
      if (disposed) return

      const bySystem = new Map()
      atlas.parts.forEach((part, partIndex) => {
        if (part.chunk !== chunkIndex) return
        const geometry = new THREE.BufferGeometry()
        geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(buffer, part.positions, part.vertexCount * 3), 3))
        geometry.setAttribute('normal', new THREE.BufferAttribute(new Int16Array(buffer, part.normals, part.vertexCount * 3), 3, true))
        geometry.setIndex(new THREE.BufferAttribute(new Uint32Array(buffer, part.indices, part.indexCount), 1))
        geometry.setAttribute('partIndex', new THREE.BufferAttribute(new Float32Array(part.vertexCount).fill(partIndex), 1))
        geometry.boundingBox = bounds[partIndex].clone()
        geometry.computeBoundingSphere()
        geometries.push(geometry)

        const picker = new THREE.Mesh(geometry, new THREE.MeshBasicMaterial({ visible: false }))
        picker.matrixAutoUpdate = true
        pickers[partIndex] = picker

        const group = bySystem.get(part.system) || []
        group.push(geometry)
        bySystem.set(part.system, group)
      })

      bySystem.forEach((parts, systemId) => {
        const merged = mergeGeometries(parts, false)
        if (!merged) return
        geometries.push(merged)
        const mesh = new THREE.Mesh(merged, materialMap.get(systemId))
        mesh.frustumCulled = false
        scene.add(mesh)
      })

      loadedChunks += 1
      onProgress?.(Math.round((loadedChunks / atlas.chunks.length) * 100))
    }

    const loadAll = async () => {
      try {
        let cursor = 0
        const workers = Array.from({ length: Math.min(3, atlas.chunks.length) }, async () => {
          while (!disposed) {
            const index = cursor
            cursor += 1
            if (index >= atlas.chunks.length) break
            await loadChunk(index)
          }
        })
        await Promise.all(workers)
        if (!disposed) ready = true
      } catch (error) {
        if (!disposed && error?.name !== 'AbortError') onError?.(error instanceof Error ? error.message : 'Could not load the anatomy model.')
      }
    }
    loadAll()

    const updateModelState = (force = false) => {
      const next = latestState.current
      const explodeDelta = Math.abs(currentExplode - next.explode)
      currentExplode = THREE.MathUtils.lerp(currentExplode, next.explode, force ? 1 : 0.14)
      const moving = explodeDelta > 0.0006
      if (!force && next === lastStateRef && !moving) return

      const visibleSystems = new Set(next.visible)
      const selected = new Set(next.selected || [])
      const affected = new Set(next.affected || [])
      const visibleParts = atlas.parts.filter((part) => next.isolate ? selected.has(part.id) : visibleSystems.has(part.system) || selected.has(part.id) || affected.has(part.id))
      const nextLayoutKey = `${visibleParts.map((part) => part.id).join(',')}:${camera.aspect.toFixed(3)}`
      if (currentExplode > 0.42 && nextLayoutKey !== layoutKey) {
        const layout = createExplosionLayout(visibleParts, camera.aspect)
        layoutSize = { width: layout.width, height: layout.height }
        atlas.parts.forEach((part, index) => {
          const cell = layout.cells.get(part.id)
          offsets[index] = cell ? new THREE.Vector3(cell.x, cell.y + 0.86, 0) : centers[index].clone()
        })
        layoutKey = nextLayoutKey
      }

      atlas.parts.forEach((part, index) => {
        const center = centers[index]
        let dx = 0, dy = 0, dz = 0
        if (currentExplode <= 0.45) {
          const amount = currentExplode / 0.45
          const systemIndex = Math.max(0, SYSTEMS.findIndex((system) => system.id === part.system))
          const angle = (systemIndex / SYSTEMS.length) * Math.PI * 2
          dx = Math.sin(angle) * amount * 0.48
          dy = (center.y - 0.86) * amount * 0.27
          dz = Math.cos(angle) * amount * 0.48
        } else {
          const amount = (currentExplode - 0.45) / 0.55
          const systemIndex = Math.max(0, SYSTEMS.findIndex((system) => system.id === part.system))
          const angle = (systemIndex / SYSTEMS.length) * Math.PI * 2
          const destination = offsets[index] || center
          dx = THREE.MathUtils.lerp(Math.sin(angle) * 0.48, destination.x - center.x, amount)
          dy = THREE.MathUtils.lerp((center.y - 0.86) * 0.27, destination.y - center.y, amount)
          dz = THREE.MathUtils.lerp(Math.cos(angle) * 0.48, -center.z, amount)
        }
        const visible = next.isolate ? selected.has(part.id) : visibleSystems.has(part.system) || selected.has(part.id) || affected.has(part.id)
        const base = index * 4
        partStateData[base] = dx
        partStateData[base + 1] = dy
        partStateData[base + 2] = dz
        partStateData[base + 3] = visible ? 1 : 0
        selectionData[base] = selected.has(part.id) ? 255 : 0
        selectionData[base + 1] = affected.has(part.id) ? 255 : 0
        selectionData[base + 2] = 0
        selectionData[base + 3] = 255
        const picker = pickers[index]
        if (picker) {
          picker.position.set(dx, dy, dz)
          picker.updateMatrixWorld(true)
        }
      })
      partStateTexture.needsUpdate = true
      selectionTexture.needsUpdate = true
      lastStateRef = next

      if (next.reset !== lastReset || next.view !== lastView) {
        lastReset = next.reset
        lastView = next.view
        setView(camera, controls, next.view, currentExplode, layoutSize, host)
      }
    }

    const resize = () => {
      const width = Math.max(1, host.clientWidth)
      const height = Math.max(1, host.clientHeight)
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, width < 760 ? 1.5 : 2))
      renderer.setSize(width, height, false)
      camera.aspect = width / height
      camera.updateProjectionMatrix()
      layoutKey = ''
      updateModelState(true)
      setView(camera, controls, latestState.current.view, currentExplode, layoutSize, host)
    }
    const resizeObserver = new ResizeObserver(resize)
    resizeObserver.observe(host)
    resize()

    const raycaster = new THREE.Raycaster()
    const pointer = new THREE.Vector2()
    const worldBox = new THREE.Box3()
    const hitPoint = new THREE.Vector3()
    let pointerDown = null

    const onPointerDown = (event) => {
      pointerDown = { id: event.pointerId, x: event.clientX, y: event.clientY }
      renderer.domElement.style.cursor = 'grabbing'
    }
    const onPointerMove = (event) => {
      if (!pointerDown) return
      const distance = Math.hypot(event.clientX - pointerDown.x, event.clientY - pointerDown.y)
      if (distance > 7) pointerDown.dragged = true
    }
    const onPointerCancel = () => {
      pointerDown = null
      renderer.domElement.style.cursor = 'grab'
    }
    const onPointerUp = (event) => {
      renderer.domElement.style.cursor = 'grab'
      if (!pointerDown || pointerDown.id !== event.pointerId || pointerDown.dragged || !ready) {
        pointerDown = null
        return
      }
      pointerDown = null
      const rect = renderer.domElement.getBoundingClientRect()
      pointer.set(((event.clientX - rect.left) / rect.width) * 2 - 1, -((event.clientY - rect.top) / rect.height) * 2 + 1)
      raycaster.setFromCamera(pointer, camera)
      const s = latestState.current
      const visibleSystems = new Set(s.visible)
      const selected = new Set(s.selected || [])
      const affected = new Set(s.affected || [])
      let bestDistance = Infinity
      let bestIndex = -1
      atlas.parts.forEach((part, index) => {
        const picker = pickers[index]
        if (!picker) return
        const visible = s.isolate ? selected.has(part.id) : visibleSystems.has(part.system) || selected.has(part.id) || affected.has(part.id)
        if (!visible) return
        worldBox.copy(bounds[index]).translate(picker.position)
        if (!raycaster.ray.intersectBox(worldBox, hitPoint)) return
        const hits = raycaster.intersectObject(picker, false)
        if (hits[0] && hits[0].distance < bestDistance) {
          bestDistance = hits[0].distance
          bestIndex = index
        }
      })
      if (bestIndex >= 0) latestSelect.current?.(atlas.parts[bestIndex].id)
    }

    renderer.domElement.style.cursor = 'grab'
    renderer.domElement.addEventListener('pointerdown', onPointerDown)
    renderer.domElement.addEventListener('pointermove', onPointerMove)
    renderer.domElement.addEventListener('pointerup', onPointerUp)
    renderer.domElement.addEventListener('pointercancel', onPointerCancel)

    const clock = new THREE.Clock()
    const animate = () => {
      if (disposed) return
      animationFrame = requestAnimationFrame(animate)
      const s = latestState.current
      controls.autoRotate = Boolean(s.rotate && s.explode < 0.42)
      const delta = Math.min(clock.getDelta(), 0.05)
      controls.update(delta)
      const pulseTime = clock.elapsedTime
      materials.forEach((material) => {
        const shader = material.userData.shader
        if (shader?.uniforms?.pulseTime) shader.uniforms.pulseTime.value = pulseTime
      })
      updateModelState(false)
      renderer.render(scene, camera)
    }
    animate()

    return () => {
      disposed = true
      cancelAnimationFrame(animationFrame)
      abortController.abort()
      resizeObserver.disconnect()
      renderer.domElement.removeEventListener('pointerdown', onPointerDown)
      renderer.domElement.removeEventListener('pointermove', onPointerMove)
      renderer.domElement.removeEventListener('pointerup', onPointerUp)
      renderer.domElement.removeEventListener('pointercancel', onPointerCancel)
      controls.dispose()
      env.texture.dispose()
      partStateTexture.dispose()
      selectionTexture.dispose()
      geometries.forEach((geometry) => geometry.dispose())
      materials.forEach((material) => material.dispose())
      pickers.forEach((picker) => picker?.material?.dispose?.())
      stageMaterial.dispose()
      ring.geometry.dispose()
      ring.material.dispose()
      platform.geometry.dispose()
      renderer.dispose()
      renderer.domElement.remove()
    }
  }, [atlas, onError, onProgress])

  return <div ref={hostRef} className="atlas-scene-host" />
}
