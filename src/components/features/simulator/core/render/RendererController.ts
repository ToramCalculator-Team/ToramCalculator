import { Color3 } from "@babylonjs/core/Maths/math";
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
import { Mesh } from "@babylonjs/core/Meshes/mesh";
import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder";
import { Scene } from "@babylonjs/core/scene";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { DynamicTexture } from "@babylonjs/core/Materials/Textures/dynamicTexture";
import {
  RendererCmd,
  RendererController,
  SpawnCmd,
} from "./RendererProtocol";

type EntityId = string;

type EntityRuntime = {
  mesh: Mesh;
  label?: Mesh;
  labelTexture?: DynamicTexture;
  lastSeq: number;
  // 运动学状态
  pos: Vector3;
  vel: Vector3;
  dir: { x: number; z: number };
  speed: number;
  accel: number;
  moving: boolean;
  yaw: number;
  decel: number;
};

export function createRendererController(scene: Scene): RendererController {
  const idToEntity = new Map<EntityId, EntityRuntime>();

  function makeSphere(id: string, name: string, position: Vector3, color?: string, radius = 0.2): EntityRuntime {
    const sphere = MeshBuilder.CreateSphere(`member:${id}`, { diameter: radius * 2 }, scene);
    sphere.position.copyFrom(position);

    const mat = new StandardMaterial(`mat:${id}`, scene);
    const baseColor = color ? Color3.FromHexString(color.startsWith("#") ? color : `#${color}`) : Color3.FromHexString("#3aa6ff");
    mat.diffuseColor = baseColor;
    mat.emissiveColor = baseColor.scale(0.2);
    sphere.material = mat;

    const label = MeshBuilder.CreatePlane(`label:${id}`, { size: radius * 4 }, scene);
    label.billboardMode = Mesh.BILLBOARDMODE_ALL;
    label.position = position.add(new Vector3(0, radius * 3, 0));
    const tex = new DynamicTexture(`lbl:${id}`, { width: 256, height: 64 }, scene, false);
    const ctx = tex.getContext();
    ctx.font = "bold 28px system-ui, sans-serif";
    ctx.fillStyle = "#fff";
    ctx.strokeStyle = "#000";
    ctx.lineWidth = 4;
    ctx.strokeText(name, 8, 42);
    ctx.fillText(name, 8, 42);
    tex.update();
    const lblMat = new StandardMaterial(`lblMat:${id}`, scene);
    lblMat.diffuseTexture = tex;
    lblMat.emissiveColor = Color3.White();
    lblMat.backFaceCulling = false;
    label.material = lblMat;

    return {
      mesh: sphere,
      label,
      labelTexture: tex,
      lastSeq: -1,
      pos: position.clone(),
      vel: Vector3.Zero(),
      dir: { x: 0, z: 0 },
      speed: 0,
      accel: 0,
      moving: false,
      yaw: 0,
      decel: 0,
    };
  }

  function spawn(cmd: SpawnCmd) {
    const exists = idToEntity.get(cmd.entityId);
    if (exists && exists.lastSeq > cmd.seq) return; // 旧消息
    if (exists) {
      // 重新生成视为重置
      disposeEntity(cmd.entityId);
    }
    const pos = new Vector3(cmd.position.x, cmd.position.y, cmd.position.z);
    const rt = makeSphere(cmd.entityId, cmd.name, pos, cmd.props?.color, cmd.props?.radius);
    rt.lastSeq = cmd.seq;
    idToEntity.set(cmd.entityId, rt);
  }

  function disposeEntity(id: string) {
    const e = idToEntity.get(id);
    if (!e) return;
    e.mesh.dispose(false, true);
    e.label?.dispose(false, true);
    e.labelTexture?.dispose();
    idToEntity.delete(id);
  }

  function handle(cmd: RendererCmd) {
    if (cmd.type === "batch") {
      for (const c of cmd.cmds) handle(c);
      return;
    }
    const e = idToEntity.get(cmd.entityId);
    switch (cmd.type) {
      case "spawn":
        spawn(cmd);
        return;
      case "destroy":
        if (e && e.lastSeq <= cmd.seq) disposeEntity(cmd.entityId);
        return;
      case "moveStart":
        if (!e || e.lastSeq > cmd.seq) return;
        e.lastSeq = cmd.seq;
        e.dir = cmd.dir;
        e.speed = cmd.speed;
        e.accel = cmd.accel ?? 0;
        // 将移动方向转为朝向（绕Y轴的偏航角）。约定 yaw=0 面向 +Z。
        e.yaw = Math.atan2(cmd.dir.x, cmd.dir.z);
        e.moving = true;
        return;
      case "moveStop":
        if (!e || e.lastSeq > cmd.seq) return;
        e.lastSeq = cmd.seq;
        if (cmd.snapToStop) {
          e.vel.setAll(0);
          e.moving = false;
        } else {
          e.decel = cmd.decel ?? e.accel ?? 0;
          e.moving = false; // 进入减速阶段
        }
        return;
      case "face":
        if (!e || e.lastSeq > cmd.seq) return;
        e.lastSeq = cmd.seq;
        e.yaw = cmd.yaw;
        return;
      case "teleport":
        if (!e || e.lastSeq > cmd.seq) return;
        e.lastSeq = cmd.seq;
        e.pos.copyFromFloats(cmd.position.x, cmd.position.y, cmd.position.z);
        e.mesh.position.copyFrom(e.pos);
        e.label && (e.label.position = e.pos.add(new Vector3(0, (e.mesh.getBoundingInfo().boundingBox.extendSize.y || 0.2) * 3, 0)));
        e.vel.setAll(0);
        return;
      case "setName":
        if (!e || e.lastSeq > cmd.seq) return;
        e.lastSeq = cmd.seq;
        if (e.label && e.label.material instanceof StandardMaterial && e.labelTexture) {
          const ctx = e.labelTexture.getContext();
          ctx.clearRect(0, 0, e.labelTexture.getSize().width, e.labelTexture.getSize().height);
          ctx.font = "bold 28px system-ui, sans-serif";
          ctx.fillStyle = "#fff";
          ctx.strokeStyle = "#000";
          ctx.lineWidth = 4;
          ctx.strokeText(cmd.name, 8, 42);
          ctx.fillText(cmd.name, 8, 42);
          e.labelTexture.update();
        }
        return;
      case "setProps":
        if (!e || e.lastSeq > cmd.seq) return;
        e.lastSeq = cmd.seq;
        if (cmd.props.visible !== undefined) {
          e.mesh.setEnabled(cmd.props.visible);
          e.label?.setEnabled(cmd.props.visible);
        }
        if (cmd.props.color) {
          const c = Color3.FromHexString(cmd.props.color.startsWith("#") ? cmd.props.color : `#${cmd.props.color}`);
          let mat = e.mesh.material as StandardMaterial | null;
          if (!(mat instanceof StandardMaterial) || !mat) {
            mat = new StandardMaterial(`mat:${cmd.entityId}`, scene);
            e.mesh.material = mat;
          }
          mat.diffuseColor = c;
          mat.emissiveColor = c.scale(0.2);
        }
        if (cmd.props.radius) {
          const d = cmd.props.radius * 2;
          e.mesh.scaling.set(d, d, d);
        }
        return;
      case "reconcile":
        if (!e || e.lastSeq > cmd.seq) return;
        e.lastSeq = cmd.seq;
        e.pos.copyFromFloats(cmd.position.x, cmd.position.y, cmd.position.z);
        e.mesh.position.copyFrom(e.pos);
        if (cmd.velocity) e.vel.copyFromFloats(cmd.velocity.x, cmd.velocity.y, cmd.velocity.z);
        return;
      case "action":
        // 保留：可在此做闪烁/缩放等轻量表现
        return;
    }
  }

  function tick(dtSec: number) {
    idToEntity.forEach((e) => {
      // 更新速度
      const v2 = Math.hypot(e.vel.x, e.vel.z);
      if (e.moving) {
        const target = e.speed;
        let next = v2;
        if (e.accel > 0) next = Math.min(target, v2 + e.accel * dtSec);
        else next = target;
        const dirLen = Math.hypot(e.dir.x, e.dir.z) || 1;
        const nx = (e.dir.x / dirLen) * next;
        const nz = (e.dir.z / dirLen) * next;
        e.vel.x = nx;
        e.vel.z = nz;
      } else {
        // 减速到 0
        if (e.decel > 0 && v2 > 0) {
          const next = Math.max(0, v2 - e.decel * dtSec);
          if (next === 0) {
            e.vel.x = 0;
            e.vel.z = 0;
          } else {
            const scale = next / v2;
            e.vel.x *= scale;
            e.vel.z *= scale;
          }
        }
      }

      // 积分位置
      e.pos.x += e.vel.x * dtSec;
      e.pos.y += e.vel.y * dtSec;
      e.pos.z += e.vel.z * dtSec;
      e.mesh.position.copyFrom(e.pos);
      if (e.label) e.label.position = e.pos.add(new Vector3(0, 0.6, 0));
      // 朝向
      e.mesh.rotation.y = e.yaw;
    });
  }

  function send(cmd: RendererCmd | RendererCmd[]) {
    if (Array.isArray(cmd)) {
      for (const c of cmd) handle(c);
    } else {
      handle(cmd);
    }
  }

  function dispose() {
    idToEntity.forEach((e, id) => disposeEntity(id));
    idToEntity.clear();
  }

  function getEntityPose(id: EntityId) {
    const e = idToEntity.get(id);
    if (!e) return undefined;
    return { pos: { x: e.pos.x, y: e.pos.y, z: e.pos.z }, yaw: e.yaw };
  }

  return { send, tick, dispose, getEntityPose };
}


