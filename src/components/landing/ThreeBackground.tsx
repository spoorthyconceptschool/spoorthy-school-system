"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { Points, PointMaterial } from "@react-three/drei";
import { useState, useRef, Suspense } from "react";
// @ts-ignore
import * as random from "maath/random/dist/maath-random.esm";

function StarField(props: any) {
    const ref = useRef<any>(null);
    // Generate 2000 random points in a sphere
    const [sphere] = useState<Float32Array>(() => {
        const data = new Float32Array(2000 * 3);
        return random.inSphere(data as any, { radius: 1.5 }) as Float32Array;
    });

    useFrame((state, delta) => {
        if (ref.current) {
            ref.current.rotation.x -= delta / 10;
            ref.current.rotation.y -= delta / 15;
        }
    });

    return (
        <group rotation={[0, 0, Math.PI / 4]}>
            <Points ref={ref} positions={sphere} stride={3} frustumCulled={false} {...props}>
                <PointMaterial
                    transparent
                    color="#fbbf24" // Accent color (amber-400 approx)
                    size={0.003}
                    sizeAttenuation={true}
                    depthWrite={false}
                />
            </Points>
        </group>
    );
}

export default function ThreeBackground() {
    return (
        <div className="absolute inset-0 z-0 opacity-40 pointer-events-none">
            <Canvas camera={{ position: [0, 0, 1] }}>
                <Suspense fallback={null}>
                    <StarField />
                </Suspense>
            </Canvas>
        </div>
    );
}
