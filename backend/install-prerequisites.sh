#!/bin/bash
set -e

#!/bin/bash

# Ubuntu/Debian Installation Fix Script for QualityControlSbi
# This script will install all missing prerequisites

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🔧 Installing Prerequisites for Ubuntu/Debian${NC}"
echo "=============================================="

# Function to print status
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_step() {
    echo -e "${BLUE}[STEP]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

# Update package list
print_step "Updating package list..."
sudo apt update

# Install curl and wget if not present
print_step "Installing basic tools..."
sudo apt install -y curl wget gnupg2 software-properties-common apt-transport-https ca-certificates

# 1. Install Node.js using NodeSource repository
print_step "Installing Node.js and npm..."
curl -fsSL https://deb.nodesource.com/setup_lts.x | sudo -E bash -
sudo apt-get install -y nodejs

print_status "Node.js and npm installed successfully"
node --version
npm --version

# 2. Install NVM (Node Version Manager) for user
print_step "Installing NVM (Node Version Manager)..."
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.5/install.sh | bash

# Add NVM to current session
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
[ -s "$NVM_DIR/bash_completion" ] && \. "$NVM_DIR/bash_completion"

print_status "NVM installed. You may need to restart your terminal or run: source ~/.bashrc"

# 3. Install MongoDB Community Edition
print_step "Installing MongoDB Community Edition..."

# Import MongoDB public GPG key
wget -qO - https://www.mongodb.org/static/pgp/server-7.0.asc | sudo apt-key add -

# Add MongoDB repository
echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu $(lsb_release -cs)/mongodb-org/7.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-7.0.list

# Update package list and install MongoDB
sudo apt-get update
sudo apt-get install -y mongodb-org

# Start and enable MongoDB service
sudo systemctl start mongod
sudo systemctl enable mongod

print_status "MongoDB installed and started successfully"

# 4. Install PostgreSQL
print_step "Installing PostgreSQL..."
sudo apt update
sudo apt install -y postgresql postgresql-contrib

# Start and enable PostgreSQL
sudo systemctl start postgresql
sudo systemctl enable postgresql

print_status "PostgreSQL installed and started successfully"

# 5. Install Docker
print_step "Installing Docker..."

# Remove old versions
sudo apt-get remove -y docker docker-engine docker.io containerd runc

# Install Docker's official repository
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg

echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# Install Docker Engine
sudo apt-get update
sudo apt-get install -y docker-ce docker-ce-cli containerd.io

# Start and enable Docker
sudo systemctl start docker
sudo systemctl enable docker

# Add current user to docker group
sudo usermod -aG docker $USER

print_status "Docker installed successfully"

# 6. Install Docker Compose
print_step "Installing Docker Compose..."
sudo curl -L "https://github.com/docker/compose/releases/download/v2.20.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

print_status "Docker Compose installed successfully"

# 7. Create necessary directories for MongoDB
print_step "Creating MongoDB directories..."
sudo mkdir -p /usr/local/var/mongodb
sudo mkdir -p /usr/local/var/log/mongodb
sudo chown -R mongodb:mongodb /usr/local/var/mongodb
sudo chown -R mongodb:mongodb /usr/local/var/log/mongodb

# 8. Install Git (if not already installed)
print_step "Installing Git..."
sudo apt install -y git

# 9. Install additional useful tools
print_step "Installing additional development tools..."
sudo apt install -y build-essential python3-pip tree htop

# Verification
echo ""
echo -e "${GREEN}🎉 Installation completed!${NC}"
echo "================================="

echo -e "${BLUE}📋 Verification:${NC}"
echo "Node.js: $(node --version 2>/dev/null || echo 'Not found')"
echo "npm: $(npm --version 2>/dev/null || echo 'Not found')"
echo "MongoDB: $(mongod --version 2>/dev/null | head -n1 || echo 'Not found')"
echo "PostgreSQL: $(psql --version 2>/dev/null || echo 'Not found')"
echo "Docker: $(docker --version 2>/dev/null || echo 'Not found')"
echo "Docker Compose: $(docker-compose --version 2>/dev/null || echo 'Not found')"
echo "Git: $(git --version 2>/dev/null || echo 'Not found')"

echo ""
echo -e "${YELLOW}⚠️ Important Notes:${NC}"
echo "1. Please logout and login again (or restart terminal) to use Docker without sudo"
echo "2. To use NVM, run: source ~/.bashrc"
echo "3. MongoDB is running as a system service"
echo "4. PostgreSQL is running as a system service"

echo ""
echo -e "${GREEN}✅ Next Steps:${NC}"
echo "1. Restart your terminal or run: source ~/.bashrc"
echo "2. Test MongoDB: mongosh"
echo "3. Test PostgreSQL: sudo -u postgres psql"
echo "4. Test Docker: docker run hello-world"
echo "5. Continue with QualityControlSbi installation"

# Create a quick test script
cat > test-installation.sh << 'EOF'
#!/bin/bash

echo "🧪 Testing installation..."

# Test Node.js
echo -n "Node.js: "
if command -v node >/dev/null 2>&1; then
    echo "✅ $(node --version)"
else
    echo "❌ Not found"
fi

# Test npm
echo -n "npm: "
if command -v npm >/dev/null 2>&1; then
    echo "✅ $(npm --version)"
else
    echo "❌ Not found"
fi

# Test MongoDB
echo -n "MongoDB: "
if command -v mongosh >/dev/null 2>&1; then
    if mongosh --eval "db.runCommand('ping').ok" --quiet 2>/dev/null; then
        echo "✅ Running and accessible"
    else
        echo "⚠️  Installed but not accessible"
    fi
else
    echo "❌ Not found"
fi

# Test PostgreSQL
echo -n "PostgreSQL: "
if command -v psql >/dev/null 2>&1; then
    if sudo -u postgres psql -c "SELECT version();" >/dev/null 2>&1; then
        echo "✅ Running and accessible"
    else
        echo "⚠️  Installed but not accessible"
    fi
else
    echo "❌ Not found"
fi

# Test Docker
echo -n "Docker: "
if command -v docker >/dev/null 2>&1; then
    if docker ps >/dev/null 2>&1; then
        echo "✅ Running and accessible"
    else
        echo "⚠️  Installed but may need logout/login to use without sudo"
    fi
else
    echo "❌ Not found"
fi

echo ""
echo "🎯 Installation test completed!"
