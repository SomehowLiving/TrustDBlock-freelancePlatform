#!/bin/bash

# Freelance Platform API Testing Script
# Make sure your server is running: npm run dev

echo "🚀 Starting Freelance Platform API Tests"
echo "========================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

BASE_URL="http://localhost:3000/api"

# Test wallet addresses (use actual addresses in production)
CLIENT_ADDRESS="0x496bA83da236cFF6a0efFf3Edea427bcAd96eeFE"
FREELANCER_ADDRESS="0xF708059673F78fc8bB01CF56C315519312E58079"
FREELANCER_2="0x7E90f5F4b2222F5574f8A2e7f230270AaD5649C6"
ADMIN_KEY="demo-admin-key"


echo -e "${YELLOW}Testing with:${NC}"
echo "Client Address: $CLIENT_ADDRESS"
echo "Freelancer Address: $FREELANCER_ADDRESS"
echo "Freelancer Address: $FREELANCER_2"
echo "Base URL: $BASE_URL"
echo ""

# Function to make requests and show results
test_api() {
    local method=$1
    local endpoint=$2
    local data=$3
    local headers=$4
    local description=$5
    
    echo -e "${YELLOW}Testing: $description${NC}"
    echo "→ $method $endpoint"
    
    if [ -n "$data" ]; then
        echo "→ Data: $data"
    fi
    
    if [ -n "$headers" ]; then
        response=$(curl -s -X "$method" "$BASE_URL$endpoint" \
            -H "Content-Type: application/json" \
            $headers \
            ${data:+-d "$data"})
    else
        response=$(curl -s -X "$method" "$BASE_URL$endpoint" \
            -H "Content-Type: application/json" \
            ${data:+-d "$data"})
    fi
    
    if echo "$response" | grep -q '"success":true'; then
        echo -e "${GREEN}✅ Success${NC}"
        echo "$response" | jq '.' 2>/dev/null || echo "$response"
    else
        echo -e "${RED}❌ Failed${NC}"
        echo "$response" | jq '.' 2>/dev/null || echo "$response"
    fi
    echo ""
    sleep 1
}

# 1. Health Check
echo -e "${GREEN}=== 1. HEALTH CHECKS ===${NC}"
test_api "GET" "/health" "" "" "Health check"
test_api "GET" "/health/db" "" "" "Database health check"

# 2. Project Creation
echo -e "${GREEN}=== 2. PROJECT CREATION ===${NC}"
PROJECT_DATA='{
  "title": "E-commerce Website Development",
  "description": "Build a modern e-commerce platform with React and Node.js",
  "requirements": ["React", "Node.js", "Payment Integration"],
  "skills": ["Frontend", "Backend", "UI/UX"],
  "category": "Web Development",
  "budget": "0.05",
  "applicationPeriodDays": 2,
  "expectedMilestones": 2,
  "walletAddress": "'$CLIENT_ADDRESS'"
}'

test_api "POST" "/projects" "$PROJECT_DATA" "-H 'x-wallet-address: $CLIENT_ADDRESS'" "Create new project"

# Store project ID for further tests (assuming project ID is 1 for demo)
PROJECT_ID=1

# 3. Get Projects
echo -e "${GREEN}=== 3. PROJECT RETRIEVAL ===${NC}"
test_api "GET" "/projects" "" "" "Get all projects"
test_api "GET" "/projects/$PROJECT_ID" "" "" "Get specific project"

# 4. Deposit Funds
echo -e "${GREEN}=== 4. FUND DEPOSIT ===${NC}"
DEPOSIT_DATA='{
  "amount": "0.05"
}'

test_api "POST" "/projects/$PROJECT_ID/deposit" "$DEPOSIT_DATA" "-H 'x-wallet-address: $CLIENT_ADDRESS'" "Deposit funds to project"

# 5. Apply for Project
echo -e "${GREEN}=== 5. PROJECT APPLICATIONS ===${NC}"
APPLICATION_DATA='{
  "proposedRate": "4.8",
  "estimatedDuration": "6 weeks",
  "proposalText": "I have 5+ years experience building e-commerce platforms with React and Node.js. I can deliver high-quality work within your timeline.",
  "portfolioLinks": ["https://portfolio1.com", "https://github.com/freelancer"],
  "availability": "Full-time starting next week"
}'

test_api "POST" "/projects/$PROJECT_ID/apply" "$APPLICATION_DATA" "-H 'x-wallet-address: $FREELANCER_ADDRESS'" "Apply for project"
test_api "POST" "/projects/$PROJECT_ID/apply" "$APPLICATION_DATA" "-H 'x-wallet-address: $FREELANCER_2'" "Apply with second freelancer"
test_api "GET" "/projects/$PROJECT_ID/applications" "" "" "Get project applications"

# 6. Shortlisting
echo -e "${GREEN}=== 6. FREELANCER SHORTLISTING ===${NC}"
SHORTLIST_DATA='{
  "freelancerAddresses": ["'$FREELANCER_ADDRESS'", "'$FREELANCER_2'"]
}'

test_api "POST" "/projects/$PROJECT_ID/shortlist" "$SHORTLIST_DATA" "-H 'x-wallet-address: $CLIENT_ADDRESS'" "Shortlist freelancers"

# 7. Selection Process
echo -e "${GREEN}=== 7. FREELANCER SELECTION ===${NC}"
SELECTION_DATA='{
  "freelancerAddress": "'$FREELANCER_ADDRESS'"
}'

test_api "POST" "/projects/$PROJECT_ID/select" "$SELECTION_DATA" "-H 'x-wallet-address: $CLIENT_ADDRESS'" "Select freelancer"

# Freelancer accepts project
test_api "POST" "/projects/$PROJECT_ID/accept" "{}" "-H 'x-wallet-address: $FREELANCER_ADDRESS'" "Accept project (freelancer)"

# 8. Milestone Creation
echo -e "${GREEN}=== 8. MILESTONE MANAGEMENT ===${NC}"
MILESTONES_DATA='{
  "milestones": [
    {
      "title": "UI/UX Design & Wireframes",
      "description": "Complete user interface design and interactive wireframes",
      "amount": "0.02",
      "deadline": "'$(date -d '+150 seconds' -Iseconds)'"
    },
    {
      "title": "Frontend Development",
      "description": "Build React components and user interface",
      "amount": "0.03",
      "deadline": "'$(date -d '+360 seconds' -Iseconds)'"
    }
  ],
}'

test_api "POST" "/projects/$PROJECT_ID/milestones" "$MILESTONES_DATA" "-H 'x-wallet-address: $CLIENT_ADDRESS'" "Create project milestones"

# Get project milestones
test_api "GET" "/projects/$PROJECT_ID/milestones" "" "" "Get project milestones"

# 9. Milestone Submission
echo -e "${GREEN}=== 9. MILESTONE WORK SUBMISSION ===${NC}"
# Assuming first milestone ID is 1
MILESTONE_ID=1

SUBMISSION_DATA='{
  "deliveryHash": "QmXxYyZz123456789abcdef...",
  "notes": "Completed UI/UX design as requested. All wireframes are responsive and user-tested.",
  "files": [
    {
      "name": "design-files.zip",
      "url": "https://ipfs.io/ipfs/QmXxYyZz...",
      "size": 2048000
    },
    {
      "name": "interactive-prototype.html",
      "url": "https://prototype-demo.com/project1",
      "size": 512000
    }
  ]
}'

test_api "POST" "/milestones/$MILESTONE_ID/submit" "$SUBMISSION_DATA" "-H 'x-wallet-address: $FREELANCER_ADDRESS'" "Submit milestone work"

# Get milestone details
test_api "GET" "/milestones/$MILESTONE_ID" "" "" "Get milestone details"

# 10. Milestone Approval & Payment
echo -e "${GREEN}=== 10. APPROVAL & PAYMENT ===${NC}"
test_api "POST" "/milestones/$MILESTONE_ID/approve" "{}" "-H 'x-wallet-address: $CLIENT_ADDRESS'" "Approve milestone"
# Release payment
test_api "POST" "/milestones/$MILESTONE_ID/release" "{}" "-H 'x-wallet-address: $CLIENT_ADDRESS'" "Release milestone payment"


echo ""
echo -e "${GREEN}🎉 API Testing Complete!${NC}"
echo "========================================"
# #------------------next part 2 test---------------------------

# # 11. User Data Retrieval
# echo -e "${GREEN}=== 11. USER DATA RETRIEVAL ===${NC}"
# test_api "GET" "/users/$CLIENT_ADDRESS/projects?role=client" "" "" "Get client projects"
# test_api "GET" "/users/$FREELANCER_ADDRESS/projects?role=freelancer" "" "" "Get freelancer projects"
# test_api "GET" "/users/$FREELANCER_ADDRESS/reputation" "" "" "Get freelancer reputation"

# # 12. Dispute Scenario (Optional)
# echo -e "${GREEN}=== 12. DISPUTE HANDLING ===${NC}"
# # Let's create a dispute scenario with milestone 2 (assuming it exists)
# MILESTONE_ID_2=2

# # First, we need to submit milestone 2
# SUBMISSION_DATA_2='{
#   "deliveryHash": "QmYyZzAa987654321fedcba...",
#   "notes": "Frontend development completed with all requested features.",
#   "files": [
#     {
#       "name": "frontend-code.zip",
#       "url": "https://ipfs.io/ipfs/QmYyZzAa...",
#       "size": 5120000
#     }
#   ],
#   "txHash": "0xfedcba9876543210abcdef0123456789fedcba9876543210abcdef0123456789"
# }'

# test_api "POST" "/milestones/$MILESTONE_ID_2/submit" "$SUBMISSION_DATA_2" "-H 'x-wallet-address: $FREELANCER_ADDRESS'" "Submit milestone 2 work"

# # Create dispute
# DISPUTE_DATA='{
#   "reason": "The delivered frontend does not match the agreed specifications. Several key features are missing and the responsive design is not working properly on mobile devices.",
#   "txHash": "0x987654321fedcba0123456789abcdef987654321fedcba0123456789abcdef01"
# }'

# test_api "POST" "/milestones/$MILESTONE_ID_2/dispute" "$DISPUTE_DATA" "-H 'x-wallet-address: $CLIENT_ADDRESS'" "Raise dispute on milestone"

# # Admin resolves dispute
# RESOLUTION_DATA='{
#   "milestoneId": '$MILESTONE_ID_2',
#   "winner": "'$FREELANCER_ADDRESS'",
#   "amount": "2.0",
#   "adminKey": "'$ADMIN_KEY'",
#   "txHash": "0xabcdef0123456789fedcba9876543210abcdef0123456789fedcba9876543210"
# }'

# test_api "POST" "/admin/resolve-dispute" "$RESOLUTION_DATA" "" "Resolve dispute (admin)"

# # 13. Search & Filtering
# echo -e "${GREEN}=== 13. SEARCH & FILTERING ===${NC}"
# test_api "GET" "/search/projects?q=ecommerce&minBudget=3&maxBudget=10" "" "" "Search projects"
# test_api "GET" "/projects?category=Web%20Development&status=active" "" "" "Filter by category and status"

# # 14. Platform Statistics
# echo -e "${GREEN}=== 14. PLATFORM STATISTICS ===${NC}"
# test_api "GET" "/platform/stats" "" "" "Get platform statistics"

# # 15. Advanced Queries
# echo -e "${GREEN}=== 15. ADVANCED QUERIES ===${NC}"
# test_api "GET" "/projects?skills=React,Node.js&sortBy=budget&sortOrder=desc" "" "" "Filter by skills and sort by budget"
# test_api "GET" "/projects/$PROJECT_ID/applications?status=shortlisted" "" "" "Get shortlisted applications only"

# # 16. Error Handling Tests
# echo -e "${GREEN}=== 16. ERROR HANDLING TESTS ===${NC}"
# test_api "GET" "/projects/99999" "" "" "Get non-existent project (should return 404)"

# INVALID_DATA='{
#   "title": "",
#   "budget": "invalid"
# }'
# test_api "POST" "/projects" "$INVALID_DATA" "-H 'x-wallet-address: $CLIENT_ADDRESS'" "Create project with invalid data"

# test_api "POST" "/projects/99999/apply" "$APPLICATION_DATA" "-H 'x-wallet-address: $FREELANCER_ADDRESS'" "Apply to non-existent project"

# test_api "POST" "/admin/resolve-dispute" "$RESOLUTION_DATA" "" "Try admin action without proper key (should fail)"

# # 17. Pagination Tests
# echo -e "${GREEN}=== 17. PAGINATION TESTS ===${NC}"
# test_api "GET" "/projects?page=1&limit=5" "" "" "Get projects with pagination"
# test_api "GET" "/users/$CLIENT_ADDRESS/projects?page=1&limit=10" "" "" "Get user projects with pagination"

# # 18. Complex Workflow Test
# echo -e "${GREEN}=== 18. COMPLETE WORKFLOW TEST ===${NC}"
# echo "Creating a complete project workflow..."

# # Create second project for complete workflow
# PROJECT_DATA_2='{
#   "title": "Mobile App Development",
#   "description": "React Native app for iOS and Android",
#   "requirements": ["React Native", "Firebase", "Push Notifications"],
#   "skills": ["Mobile Development", "React Native", "Backend"],
#   "category": "Mobile Development",
#   "budget": "8.0",
#   "applicationPeriodDays": 10,
#   "expectedMilestones": 4,
#   "walletAddress": "'$CLIENT_ADDRESS'"
# }'

# test_api "POST" "/projects" "$PROJECT_DATA_2" "-H 'x-wallet-address: $CLIENT_ADDRESS'" "Create second project"

# PROJECT_ID_2=2

# # Fund the project
# DEPOSIT_DATA_2='{
#   "amount": "8.5",
#   "txHash": "0x1111222233334444555566667777888899990000aaaabbbbccccddddeeeeffff"
# }'

# test_api "POST" "/projects/$PROJECT_ID_2/deposit" "$DEPOSIT_DATA_2" "-H 'x-wallet-address: $CLIENT_ADDRESS'" "Fund second project"

# # Multiple freelancers apply
# FREELANCER_3="0x1111222233334444555566667777888899990000"
# FREELANCER_4="0xaaaabbbbccccddddeeeeffff0000111122223333"

# test_api "POST" "/projects/$PROJECT_ID_2/apply" "$APPLICATION_DATA" "-H 'x-wallet-address: $FREELANCER_ADDRESS'" "Freelancer 1 applies to project 2"
# test_api "POST" "/projects/$PROJECT_ID_2/apply" "$APPLICATION_DATA" "-H 'x-wallet-address: $FREELANCER_2'" "Freelancer 2 applies to project 2"
# test_api "POST" "/projects/$PROJECT_ID_2/apply" "$APPLICATION_DATA" "-H 'x-wallet-address: $FREELANCER_3'" "Freelancer 3 applies to project 2"
# test_api "POST" "/projects/$PROJECT_ID_2/apply" "$APPLICATION_DATA" "-H 'x-wallet-address: $FREELANCER_4'" "Freelancer 4 applies to project 2"

# # Shortlist and select
# SHORTLIST_DATA_2='{
#   "freelancerAddresses": ["'$FREELANCER_ADDRESS'", "'$FREELANCER_3'", "'$FREELANCER_4'"]
# }'

# test_api "POST" "/projects/$PROJECT_ID_2/shortlist" "$SHORTLIST_DATA_2" "-H 'x-wallet-address: $CLIENT_ADDRESS'" "Shortlist for project 2"

# SELECTION_DATA_2='{
#   "freelancerAddress": "'$FREELANCER_3'",
#   "txHash": "0x2222333344445555666677778888999900001111aaaabbbbccccddddeeeeffff"
# }'

# test_api "POST" "/projects/$PROJECT_ID_2/select" "$SELECTION_DATA_2" "-H 'x-wallet-address: $CLIENT_ADDRESS'" "Select freelancer for project 2"

# # Final status check
# echo -e "${GREEN}=== 19. FINAL STATUS CHECKS ===${NC}"
# test_api "GET" "/projects" "" "" "Get all projects - final state"
# test_api "GET" "/platform/stats" "" "" "Final platform statistics"

# echo ""
# echo -e "${GREEN}🎉 API Testing Complete!${NC}"
# echo "========================================"
# echo ""
# echo -e "${YELLOW}Summary of tested endpoints:${NC}"
# echo "✅ Health checks"
# echo "✅ Project CRUD operations"
# echo "✅ Application system"
# echo "✅ Freelancer selection process"
# echo "✅ Milestone management"
# echo "✅ Payment processing"
# echo "✅ Dispute handling"
# echo "✅ User data retrieval"
# echo "✅ Search and filtering"
# echo "✅ Platform statistics"
# echo "✅ Error handling"
# echo "✅ Pagination"
# echo ""
# echo -e "${YELLOW}Next steps:${NC}"
# echo "1. Connect to your deployed smart contract"
# echo "2. Add proper wallet authentication"
# echo "3. Implement IPFS for file storage"
# echo "4. Add comprehensive error handling"
# echo "5. Set up production database"
# echo ""
# echo -e "${GREEN}Happy coding! 🚀${NC}"