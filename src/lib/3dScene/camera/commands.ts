/**
 * 相机控制指令类型（相机/注意力关注点）。
 *
 * 相机控制器（thirdPersonController）内部的指令词汇，与 engine 侧的跨线程渲染协议
 * （engine/core/thread/RendererProtocol 的 CameraFollowCmd extends CmdBase）是两回事：
 * 这里是主线程渲染层内部的相机操纵指令，不跨 Worker。
 */

// ==================== 相机控制指令类型定义 ====================

export interface CameraControlCmd {
    type: "camera_control";
    entityId: string;
    subType: "follow" | "free" | "setDistance" | "setAngle" | "setTarget";
    data: any;
    seq: number;
    ts: number;
}

export interface CameraFollowCmd extends CameraControlCmd {
    subType: "follow";
    data: {
        followEntityId: string;
        distance?: number;
        verticalAngle?: number;
        horizontalAngle?: number;
    };
}

export interface CameraSetDistanceCmd extends CameraControlCmd {
    subType: "setDistance";
    data: {
        distance: number;
        smooth?: boolean;
    };
}

export interface CameraSetAngleCmd extends CameraControlCmd {
    subType: "setAngle";
    data: {
        horizontalAngle?: number;
        verticalAngle?: number;
        smooth?: boolean;
        delta?: boolean; // 是否为增量模式（用于FPS风格鼠标控制）
    };
}

export interface CameraSetTargetCmd extends CameraControlCmd {
    subType: "setTarget";
    data: {
        target: { x: number; y: number; z: number };
        smooth?: boolean;
    };
}

export type AnyCameraControlCmd = CameraFollowCmd | CameraSetDistanceCmd | CameraSetAngleCmd | CameraSetTargetCmd;