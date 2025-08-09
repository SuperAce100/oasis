#!/usr/bin/env python3
"""
Setup script for Oasis Hub development environment
"""

import subprocess
import sys
from pathlib import Path

def run_command(cmd: str, cwd: Path = None) -> bool:
    """Run a command and return True if successful"""
    try:
        print(f"Running: {cmd}")
        result = subprocess.run(
            cmd, 
            shell=True, 
            cwd=cwd, 
            capture_output=True, 
            text=True
        )
        if result.returncode == 0:
            print(f"✅ {cmd}")
            return True
        else:
            print(f"❌ {cmd}")
            print(f"Error: {result.stderr}")
            return False
    except Exception as e:
        print(f"❌ {cmd} - Exception: {e}")
        return False

def main():
    """Main setup function"""
    print("🚀 Setting up Oasis Hub development environment...")
    
    project_root = Path(__file__).parent.parent
    backend_dir = project_root / "backend"
    frontend_dir = project_root / "frontend"
    
    success = True
    
    # Check if backend exists and has package.json
    if backend_dir.exists() and (backend_dir / "package.json").exists():
        print("\n📦 Installing backend dependencies...")
        success &= run_command("npm install", backend_dir)
        
        print("\n🧪 Running backend tests...")
        success &= run_command("npm test -- --run", backend_dir)
        
        print("\n🔨 Building backend...")
        success &= run_command("npm run build", backend_dir)
    else:
        print("⚠️  Backend directory not found or missing package.json")
    
    # Check if frontend exists and has package.json
    if frontend_dir.exists() and (frontend_dir / "package.json").exists():
        print("\n🎨 Installing frontend dependencies...")
        success &= run_command("npm install", frontend_dir)
        
        print("\n🔨 Building frontend...")
        success &= run_command("npm run build", frontend_dir)
    else:
        print("⚠️  Frontend directory not found or missing package.json")
    
    if success:
        print("\n🎉 Setup completed successfully!")
        print("\n📖 Next steps:")
        print("1. Backend: cd backend && npm run dev")
        print("2. Frontend: cd frontend && npm run dev")
        print("3. Configure .env files for optional integrations")
    else:
        print("\n❌ Setup encountered some errors")
        sys.exit(1)

if __name__ == "__main__":
    main()