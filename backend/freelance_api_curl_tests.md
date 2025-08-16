# Freelance Platform API Testing with cURL

## Prerequisites
Replace these variables with your actual values:
- `BASE_URL`: Your API base URL (e.g., `http://localhost:3000/api`)
- `CLIENT_ADDRESS`: Client wallet address (0x...)
- `FREELANCER_ADDRESS`: Freelancer wallet address (0x...)
- `ADMIN_ADDRESS`: Admin wallet address (0x...)

## 1. Health Check & Contract Info

### Health Check
```bash
curl -X GET "${BASE_URL}/health"
```

### Get Contract Information
```bash
curl -X GET "${BASE_URL}/contracts"
```

## 2. User Registry APIs

### Register User as Client
```bash
curl -X POST "${BASE_URL}/users/register" \
  -H "Content-Type: application/json" \
  -H "x-wallet-address: ${CLIENT_ADDRESS}" \
  -d '{
    "role": "Client",
    "metadataHash": "QmClientMetadata123"
  }'
```

### Register User as Freelancer
```bash
curl -X POST "${BASE_URL}/users/register" \
  -H "Content-Type: application/json" \
  -H "x-wallet-address: ${FREELANCER_ADDRESS}" \
  -d '{
    "role": "Freelancer",
    "metadataHash": "QmFreelancerMetadata456"
  }'
```

### Register User as Admin
```bash
curl -X POST "${BASE_URL}/users/register" \
  -H "Content-Type: application/json" \
  -H "x-wallet-address: ${ADMIN_ADDRESS}" \
  -d '{
    "role": "Admin",
    "metadataHash": "QmAdminMetadata789"
  }'
```

### Get User Profile
```bash
curl -X GET "${BASE_URL}/users/${CLIENT_ADDRESS}"
```

### Get Users by Role
```bash
# Get all clients
curl -X GET "${BASE_URL}/users/role/Client"

# Get all freelancers
curl -X GET "${BASE_URL}/users/role/Freelancer"

# Get all admins
curl -X GET "${BASE_URL}/users/role/Admin"
```

### Get User Reputation
```bash
curl -X GET "${BASE_URL}/users/${FREELANCER_ADDRESS}/reputation"
```

## 3. Project Management APIs

### Create Project
```bash
curl -X POST "${BASE_URL}/projects" \
  -H "Content-Type: application/json" \
  -H "x-wallet-address: ${CLIENT_ADDRESS}" \
  -d '{
    "title": "Build E-commerce Website",
    "description": "Need a full-stack e-commerce website with payment integration",
    "requirements": [
      "React.js frontend",
      "Node.js backend",
      "MongoDB database",
      "Stripe payment integration"
    ],
    "skills": ["React", "Node.js", "MongoDB", "JavaScript"],
    "category": "Web Development",
    "budget": "5.0",
    "applicationPeriodDays": 7,
    "expectedMilestones": 3
  }'
```

### Get Project by ID
```bash
curl -X GET "${BASE_URL}/projects/1"
```

### Get All Projects with Filters
```bash
# Get all projects
curl -X GET "${BASE_URL}/projects"

# Get projects with pagination
curl -X GET "${BASE_URL}/projects?page=1&limit=10"

# Get projects by status
curl -X GET "${BASE_URL}/projects?status=Open"

# Get projects by client
curl -X GET "${BASE_URL}/projects?clientAddress=${CLIENT_ADDRESS}"

# Get projects by freelancer
curl -X GET "${BASE_URL}/projects?freelancerAddress=${FREELANCER_ADDRESS}"
```

### Get User's Projects
```bash
# Get all projects for a user
curl -X GET "${BASE_URL}/users/${CLIENT_ADDRESS}/projects"

# Get client projects only
curl -X GET "${BASE_URL}/users/${CLIENT_ADDRESS}/projects?role=client"

# Get freelancer projects only
curl -X GET "${BASE_URL}/users/${FREELANCER_ADDRESS}/projects?role=freelancer"
```

### Deposit Funds to Project
```bash
curl -X POST "${BASE_URL}/projects/1/deposit" \
  -H "Content-Type: application/json" \
  -H "x-wallet-address: ${CLIENT_ADDRESS}" \
  -d '{
    "amount": "2.5"
  }'
```

### Apply for Project
```bash
curl -X POST "${BASE_URL}/projects/1/apply" \
  -H "Content-Type: application/json" \
  -H "x-wallet-address: ${FREELANCER_ADDRESS}" \
  -d '{
    "proposalHash": "QmProposalHash123"
  }'
```

### Check Application Status
```bash
curl -X GET "${BASE_URL}/projects/1/applications/${FREELANCER_ADDRESS}"
```

### Shortlist Freelancers
```bash
curl -X POST "${BASE_URL}/projects/1/shortlist" \
  -H "Content-Type: application/json" \
  -H "x-wallet-address: ${CLIENT_ADDRESS}" \
  -d '{
    "freelancerAddresses": ["${FREELANCER_ADDRESS}"]
  }'
```

### Get Shortlisted Freelancers
```bash
curl -X GET "${BASE_URL}/projects/1/shortlisted"
```

### Select Freelancer
```bash
curl -X POST "${BASE_URL}/projects/1/select" \
  -H "Content-Type: application/json" \
  -H "x-wallet-address: ${CLIENT_ADDRESS}" \
  -d '{
    "freelancerAddress": "${FREELANCER_ADDRESS}"
  }'
```

### Accept Project (by Freelancer)
```bash
curl -X POST "${BASE_URL}/projects/1/accept" \
  -H "Content-Type: application/json" \
  -H "x-wallet-address: ${FREELANCER_ADDRESS}" \
  -d '{}'
```

### Rate Project
```bash
# Client rating freelancer
curl -X POST "${BASE_URL}/projects/1/rate" \
  -H "Content-Type: application/json" \
  -H "x-wallet-address: ${CLIENT_ADDRESS}" \
  -d '{
    "rating": 5
  }'

# Freelancer rating client
curl -X POST "${BASE_URL}/projects/1/rate" \
  -H "Content-Type: application/json" \
  -H "x-wallet-address: ${FREELANCER_ADDRESS}" \
  -d '{
    "rating": 4
  }'
```

## 4. Milestone Management APIs

### Create Milestones
```bash
curl -X POST "${BASE_URL}/projects/1/milestones" \
  -H "Content-Type: application/json" \
  -H "x-wallet-address: ${CLIENT_ADDRESS}" \
  -d '{
    "milestones": [
      {
        "title": "Frontend Development",
        "amount": "1.5",
        "deadline": "2025-09-15T23:59:59.000Z",
        "metadataHash": "QmMilestone1Hash"
      },
      {
        "title": "Backend Development",
        "amount": "2.0",
        "deadline": "2025-10-15T23:59:59.000Z",
        "metadataHash": "QmMilestone2Hash"
      },
      {
        "title": "Integration & Testing",
        "amount": "1.5",
        "deadline": "2025-11-15T23:59:59.000Z",
        "metadataHash": "QmMilestone3Hash"
      }
    ]
  }'
```

### Get Project Milestones
```bash
curl -X GET "${BASE_URL}/projects/1/milestones"
```

### Get Milestone Details
```bash
curl -X GET "${BASE_URL}/milestones/1"
```

### Submit Milestone Work
```bash
curl -X POST "${BASE_URL}/milestones/1/submit" \
  -H "Content-Type: application/json" \
  -H "x-wallet-address: ${FREELANCER_ADDRESS}" \
  -d '{
    "deliveryHash": "QmDeliveryHash123",
    "notes": "Completed frontend development with React components",
    "files": ["component1.js", "styles.css", "tests.js"]
  }'
```

### Final Submit Milestone
```bash
curl -X POST "${BASE_URL}/milestones/1/final-submit" \
  -H "Content-Type: application/json" \
  -H "x-wallet-address: ${FREELANCER_ADDRESS}" \
  -d '{}'
```

### Approve Milestone
```bash
curl -X POST "${BASE_URL}/milestones/1/approve" \
  -H "Content-Type: application/json" \
  -H "x-wallet-address: ${CLIENT_ADDRESS}" \
  -d '{}'
```

### Release Payment
```bash
curl -X POST "${BASE_URL}/milestones/1/release" \
  -H "Content-Type: application/json" \
  -H "x-wallet-address: ${CLIENT_ADDRESS}" \
  -d '{}'
```

### Auto Approve Milestone (after timeout)
```bash
curl -X POST "${BASE_URL}/milestones/1/auto-approve" \
  -H "Content-Type: application/json" \
  -d '{}'
```

## 5. Extension & Dispute APIs

### Request Milestone Extension
```bash
curl -X POST "${BASE_URL}/milestones/1/request-extension" \
  -H "Content-Type: application/json" \
  -H "x-wallet-address: ${FREELANCER_ADDRESS}" \
  -d '{
    "newDeadline": "2025-09-30T23:59:59.000Z"
  }'
```

### Approve Extension
```bash
curl -X POST "${BASE_URL}/milestones/1/approve-extension" \
  -H "Content-Type: application/json" \
  -H "x-wallet-address: ${CLIENT_ADDRESS}" \
  -d '{
    "newDeadline": "2025-09-30T23:59:59.000Z"
  }'
```

### Dispute Milestone
```bash
curl -X POST "${BASE_URL}/milestones/1/dispute" \
  -H "Content-Type: application/json" \
  -H "x-wallet-address: ${CLIENT_ADDRESS}" \
  -d '{
    "reason": "Work does not meet the specified requirements and quality standards"
  }'
```

### Request Milestone Cancellation
```bash
curl -X POST "${BASE_URL}/milestones/1/request-cancellation" \
  -H "Content-Type: application/json" \
  -H "x-wallet-address: ${CLIENT_ADDRESS}" \
  -d '{}'
```

### Auto Cancel Milestone
```bash
curl -X POST "${BASE_URL}/milestones/1/auto-cancel" \
  -H "Content-Type: application/json" \
  -d '{}'
```

## 6. Admin APIs

### Resolve Dispute
```bash
curl -X POST "${BASE_URL}/admin/resolve-dispute" \
  -H "Content-Type: application/json" \
  -d '{
    "milestoneId": 1,
    "winner": "${FREELANCER_ADDRESS}",
    "disputedAmount": "1.5",
    "adminKey": "demo-admin-key"
  }'
```

### Update Platform Fee
```bash
curl -X POST "${BASE_URL}/admin/update-platform-fee" \
  -H "Content-Type: application/json" \
  -d '{
    "feePercent": 250,
    "adminKey": "demo-admin-key"
  }'
```

### Update Freelancer Fee
```bash
curl -X POST "${BASE_URL}/admin/update-freelancer-fee" \
  -H "Content-Type: application/json" \
  -d '{
    "feePercent": 200,
    "adminKey": "demo-admin-key"
  }'
```

## 7. Emergency & Withdrawal APIs

### Emergency Withdraw
```bash
curl -X POST "${BASE_URL}/projects/1/emergency-withdraw" \
  -H "Content-Type: application/json" \
  -H "x-wallet-address: ${CLIENT_ADDRESS}" \
  -d '{}'
```

### Withdraw Excess Funds
```bash
curl -X POST "${BASE_URL}/projects/1/withdraw-excess" \
  -H "Content-Type: application/json" \
  -H "x-wallet-address: ${CLIENT_ADDRESS}" \
  -d '{}'
```

## 8. Platform Statistics

### Get Platform Stats
```bash
curl -X GET "${BASE_URL}/platform/stats"
```

## 9. Testing Workflow Example

Here's a complete workflow to test the platform:

```bash
#!/bin/bash

# Set your variables
BASE_URL="http://localhost:3000/api"
CLIENT_ADDRESS="0x1111111111111111111111111111111111111111"
FREELANCER_ADDRESS="0x2222222222222222222222222222222222222222"

# 1. Health check
echo "=== Health Check ==="
curl -X GET "${BASE_URL}/health"
echo -e "\n"

# 2. Register users
echo "=== Register Client ==="
curl -X POST "${BASE_URL}/users/register" \
  -H "Content-Type: application/json" \
  -H "x-wallet-address: ${CLIENT_ADDRESS}" \
  -d '{"role": "Client", "metadataHash": "QmClientHash"}'
echo -e "\n"

echo "=== Register Freelancer ==="
curl -X POST "${BASE_URL}/users/register" \
  -H "Content-Type: application/json" \
  -H "x-wallet-address: ${FREELANCER_ADDRESS}" \
  -d '{"role": "Freelancer", "metadataHash": "QmFreelancerHash"}'
echo -e "\n"

# 3. Create project
echo "=== Create Project ==="
curl -X POST "${BASE_URL}/projects" \
  -H "Content-Type: application/json" \
  -H "x-wallet-address: ${CLIENT_ADDRESS}" \
  -d '{
    "title": "Test Project",
    "description": "A test project for API validation",
    "budget": "1.0",
    "expectedMilestones": 2
  }'
echo -e "\n"

# 4. Get project
echo "=== Get Project ==="
curl -X GET "${BASE_URL}/projects/1"
echo -e "\n"

# 5. Apply for project
echo "=== Apply for Project ==="
curl -X POST "${BASE_URL}/projects/1/apply" \
  -H "Content-Type: application/json" \
  -H "x-wallet-address: ${FREELANCER_ADDRESS}" \
  -d '{"proposalHash": "QmProposal"}'
echo -e "\n"

# Continue with other endpoints...
```

## Error Response Examples

Most APIs will return errors in this format:
```json
{
  "success": false,
  "error": "Error message",
  "details": "Detailed error information"
}
```

## Success Response Examples

Successful responses follow this format:
```json
{
  "success": true,
  "data": { /* response data */ },
  "message": "Optional message for contract calls"
}
```

## Environment Variables

Make sure these are set in your environment:
- `FREELANCE_PLATFORM_ADDRESS`: Smart contract address
- `USER_REGISTRY_ADDRESS`: User registry contract address  
- `RPC_URL`: Blockchain RPC endpoint
- `ADMIN_KEY`: Admin authentication key
- `CHAIN_ID`: Blockchain chain ID

## Notes

1. Replace placeholder addresses with actual wallet addresses
2. Some endpoints require user registration before use
3. Contract call responses include transaction parameters for blockchain interaction
4. Pagination is available on list endpoints (page, limit parameters)
5. All amounts are in ETH (e.g., "1.5" = 1.5 ETH)
6. Timestamps are in Unix format or ISO 8601 strings
7. IPFS hashes are used for metadata storage