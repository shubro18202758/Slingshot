import { type PgliteDatabase } from "drizzle-orm/pglite";
import * as schema from "./schema";

// Helper to generate dummy embeddings
function generateDummyVector(dim: number): number[] {
    return Array.from({ length: dim }, () => Math.random() * 2 - 1);
}

export async function seedStudentProfile(db: PgliteDatabase<typeof schema>) {
    console.log("🌱 Starting Student Profile Seeding...");

    // 1. Clear existing data
    try {
        await db.delete(schema.experience).execute();
        await db.delete(schema.projects).execute();
        await db.delete(schema.teammates).execute();
        await db.delete(schema.students).execute();
    } catch (e) {
        console.warn("Tables might not exist yet, proceeding to insert...", e);
    }

    // 2. Insert Student Identity
    const [student] = await db.insert(schema.students).values({
        name: "Alex 'Cipher' Mercer",
        email: "alex.mercer@mit.edu",
        phone: "+1 (555) 019-2834",
        university: "Massachusetts Institute of Technology",
        major: "Computer Science & Artificial Intelligence",
        gpa: "3.9/4.0",
        studentId: "92837401",
        transcript: "Data Structures: A, Algorithms: A, Machine Learning: A-, Cyber-Physical Systems: A, Quantum Computing: B+",
        links: {
            github: "https://github.com/cipher-mercer",
            linkedin: "https://linkedin.com/in/alex-mercer-ai",
            portfolio: "https://alexmercer.dev",
            twitter: "@cipher_ai"
        },
        demographics: {
            race: "Prefer not to say",
            gender: "Non-binary",
            veteran_status: false,
        }
    }).returning();

    console.log("✅ Student Profile Created:", student.id);

    // 3. Insert Teammates
    await db.insert(schema.teammates).values([
        {
            studentId: student.id,
            name: "Sarah Chen",
            email: "schen@mit.edu",
            role: "Hardware Lead",
            relation: "Robotics Lab Partner",
        },
        {
            studentId: student.id,
            name: "Marcus Johnson",
            email: "mjohnson@mit.edu",
            role: "UX Designer",
            relation: "Hackathon Teammate",
        },
        {
            studentId: student.id,
            name: "Dr. Emily Vance",
            email: "evance@mit.edu",
            role: "Research Advisor",
            relation: "Thesis Supervisor",
        }
    ]);

    console.log("✅ Teammates Added");

    // 4. Insert Projects (with Embeddings)
    await db.insert(schema.projects).values([
        {
            studentId: student.id,
            title: "Neural-Link Interface",
            description: "A brain-computer interface prototype utilizing EEG signals to control a robotic arm. Implemented using Python, PyTorch, and Arduino.",
            role: "Lead AI Engineer",
            url: "https://github.com/cipher-mercer/neural-link",
            skills: ["Python", "PyTorch", "Signal Processing", "Arduino", "C++"],
            embedding: generateDummyVector(384),
        },
        {
            studentId: student.id,
            title: "Quantum Cryptography Simulator",
            description: "A simulation of BB84 quantum key distribution protocol. visualizes qubit states and entanglement on a web interface.",
            role: "Solo Developer",
            url: "https://quantum-sim.demo",
            skills: ["Rust", "WebAssembly", "React", "Quantum Mechanics"],
            embedding: generateDummyVector(384),
        },
        {
            studentId: student.id,
            title: "Autonomous Drone Swarm",
            description: "Coordinated flight control system for a swarm of 5 micro-drones for search and rescue operations in dense forests.",
            role: "Path Planning Algorithmist",
            url: "https://github.com/mit-drone-lab/swarm-v2",
            skills: ["C++", "ROS", "SLAM", "Control Theory"],
            embedding: generateDummyVector(384),
        }
    ]);

    console.log("✅ Projects with Embeddings Added");

    // 5. Insert Experience (with Embeddings)
    await db.insert(schema.experience).values([
        {
            studentId: student.id,
            company: "SpaceX",
            role: "Avionics Intern",
            duration: "Summer 2024",
            description: "Developed real-time telemetry processing tools for Starship integration tests. Optimized data throughput by 40%.",
            embedding: generateDummyVector(384),
        },
        {
            studentId: student.id,
            company: "MIT Media Lab",
            role: "Undergraduate Researcher",
            duration: "Sep 2023 - Present",
            description: "Researching tangible user interfaces for musical expression. Co-authored a paper accepted at CHI 2025.",
            embedding: generateDummyVector(384),
        }
    ]);

    console.log("✅ Experience Added");
    console.log("🌱 Seeding Complete!");
}
