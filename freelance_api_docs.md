# Freelance Platform API Documentation

## Overview
This API provides comprehensive endpoints for a blockchain-integrated freelance platform supporting user registration, project management, milestone tracking, and dispute resolution.

---

## User Registry Routes

### 1. Register User
**POST** `/users/register`

**Headers:**
```json
{
  "x-wallet-address": "0x742d35Cc6488C7b97d7B8DC8E6a4Eb61E9b6c2eC",
  "Content-Type": "application/json"
}
```

**Input:**
```json
{
  "username": "john_freelancer",
  "email": "john@example.com",
  "password": "securePassword123",
  "role": "freelancer",
  "bio": "Experienced web developer with 5 years in React and Node.js",
  "skills": ["React", "Node.js", "MongoDB", "TypeScript"]
}
```

**Response (201):**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "64f8a1b2c3d4e5f6g7h8i9j0",
      "address": "0x742d35cc6488c7b97d7b8dc8e6a4eb61e9b6c2ec",
      "username": "john_freelancer",
      "email": "john@example.com",
      "role": "freelancer",
      "profile": {
        "bio": "Experienced web developer with 5 years in React and Node.js",
        "skills": ["React", "Node.js", "MongoDB", "TypeScript"],
        "availability": "available"
      }
    },
    "contractCall": {
      "contract": "UserRegistry",
      "method": "selfRegister",
      "params": ["Freelancer", "QmUserMetadata1231690876543"],
      "address": "0x2222222222222222222222222222222222222222"
    }
  },
  "message": "User created in database. Please complete blockchain registration."
}
```

### 2. Confirm Registration
**POST** `/users/:address/confirm`

**Input:**
```json
{
  "txHash": "0xabc123def456789..."
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "address": "0x742d35cc6488c7b97d7b8dc8e6a4eb61e9b6c2ec",
    "username": "john_freelancer",
    "isActive": true,
    "lastLogin": "2024-01-15T10:30:00.000Z",
    "blockchain": {
      "status": "confirmed",
      "txHash": "0xabc123def456789..."
    }
  },
  "message": "User registration confirmed successfully"
}
```

### 3. Get User Profile
**GET** `/users/:address`

**Response (200):**
```json
{
  "success": true,
  "data": {
    "user": {
      "address": "0x742d35cc6488c7b97d7b8dc8e6a4eb61e9b6c2ec",
      "username": "john_freelancer",
      "role": "freelancer",
      "profile": {
        "bio": "Experienced web developer",
        "skills": ["React", "Node.js", "MongoDB"],
        "availability": "available"
      },
      "reputation": {
        "totalProjects": 15,
        "completedProjects": 13,
        "totalEarned": 25.5,
        "averageRating": 4.7,
        "totalRatings": 12,
        "hasNFT": false,
        "successRate": 86.67
      },
      "isActive": true,
      "createdAt": "2024-01-01T00:00:00.000Z"
    }
  }
}
```

### 4. Update User Profile
**PATCH** `/users/:address`

**Headers:**
```json
{
  "x-wallet-address": "0x742d35Cc6488C7b97d7B8DC8E6a4Eb61E9b6c2eC"
}
```

**Input:**
```json
{
  "profile": {
    "bio": "Updated bio with new experience",
    "skills": ["React", "Node.js", "MongoDB", "TypeScript", "GraphQL"],
    "availability": "busy"
  },
  "preferences": {
    "notifications": true,
    "publicProfile": true
  }
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "address": "0x742d35cc6488c7b97d7b8dc8e6a4eb61e9b6c2ec",
    "profile": {
      "bio": "Updated bio with new experience",
      "skills": ["React", "Node.js", "MongoDB", "TypeScript", "GraphQL"],
      "availability": "busy"
    },
    "preferences": {
      "notifications": true,
      "publicProfile": true
    }
  },
  "message": "Profile updated successfully"
}
```

---

## Project Management Routes

### 5. Create Project
**POST** `/projects`

**Headers:**
```json
{
  "x-wallet-address": "0xClient123Address456..."
}
```

**Input:**
```json
{
  "title": "E-commerce Website Development",
  "description": "Need a full-stack e-commerce website with React frontend and Node.js backend. Must include payment integration, user authentication, and admin panel.",
  "budget": 5000,
  "category": "Web Development",
  "skills": ["React", "Node.js", "MongoDB", "Stripe", "Authentication"],
  "requirements": [
    "Responsive design",
    "Payment gateway integration",
    "User authentication",
    "Admin dashboard",
    "Product catalog"
  ],
  "timeline": {
    "deadline": "2024-03-15T23:59:59.000Z",
    "applicationDeadline": "2024-02-01T23:59:59.000Z"
  },
  "expectedMilestones": 4
}
```

**Response (201):**
```json
{
  "success": true,
  "data": {
    "project": {
      "_id": "64f8a1b2c3d4e5f6g7h8i9j1",
      "title": "E-commerce Website Development",
      "description": "Need a full-stack e-commerce website...",
      "client": {
        "address": "0xclient123address456...",
        "displayName": "client_user123"
      },
      "budget": {
        "total": 5000,
        "totalBudget": 5000,
        "type": "fixed"
      },
      "category": "Web Development",
      "skills": ["React", "Node.js", "MongoDB", "Stripe", "Authentication"],
      "status": "created",
      "milestones": {
        "expected": 4
      },
      "timeline": {
        "deadline": "2024-03-15T23:59:59.000Z",
        "applicationDeadline": "2024-02-01T23:59:59.000Z"
      }
    },
    "contractCall": {
      "contract": "FreelancePlatform",
      "method": "createProject",
      "params": ["5000000000000000000000", 4, "QmProjectMetadata123", 7],
      "address": "0x1111111111111111111111111111111111111111"
    }
  },
  "message": "Project created in database. Please complete blockchain transaction."
}
```

### 6. Sync Project with Blockchain
**POST** `/projects/:id/sync`

**Input:**
```json
{
  "onChainId": 42,
  "txHash": "0xproject123hash456..."
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "_id": "64f8a1b2c3d4e5f6g7h8i9j1",
    "onChainId": 42,
    "projectId": 42,
    "status": "open",
    "blockchain": {
      "status": "confirmed",
      "txHash": "0xproject123hash456..."
    }
  },
  "message": "Project synced with blockchain successfully"
}
```

### 7. Get Projects (with filtering)
**GET** `/projects?status=open&category=Web%20Development&minBudget=1000&maxBudget=10000&skills=React,Node.js&page=1&limit=10`

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "_id": "64f8a1b2c3d4e5f6g7h8i9j1",
      "title": "E-commerce Website Development",
      "description": "Need a full-stack e-commerce website...",
      "budget": {
        "total": 5000
      },
      "category": "Web Development",
      "skills": ["React", "Node.js", "MongoDB"],
      "status": "open",
      "client": {
        "address": "0xclient123address456...",
        "displayName": "client_user123"
      },
      "applications": {
        "count": 8
      },
      "timeline": {
        "deadline": "2024-03-15T23:59:59.000Z"
      },
      "createdAt": "2024-01-15T10:00:00.000Z"
    }
  ],
  "pagination": {
    "currentPage": 1,
    "totalPages": 3,
    "totalItems": 25,
    "itemsPerPage": 10
  }
}
```

### 8. Get Project Details
**GET** `/projects/:id`

**Response (200):**
```json
{
  "success": true,
  "data": {
    "project": {
      "_id": "64f8a1b2c3d4e5f6g7h8i9j1",
      "title": "E-commerce Website Development",
      "description": "Need a full-stack e-commerce website...",
      "status": "active",
      "budget": {
        "total": 5000,
        "escrowBalance": 5000
      },
      "client": {
        "address": "0xclient123address456...",
        "displayName": "client_user123"
      },
      "freelancer": {
        "address": "0x742d35cc6488c7b97d7b8dc8e6a4eb61e9b6c2ec",
        "displayName": "john_freelancer"
      }
    },
    "applications": 8,
    "applicationsDetail": [
      {
        "_id": "64f8a1b2c3d4e5f6g7h8i9j2",
        "freelancer": {
          "wallet": "0x742d35cc6488c7b97d7b8dc8e6a4eb61e9b6c2ec",
          "displayName": "john_freelancer"
        },
        "proposal": {
          "coverLetter": "I have 5 years of experience...",
          "proposedBudget": 4800,
          "proposedTimeline": 45
        }
      }
    ],
    "milestones": 4,
    "milestonesDetail": [
      {
        "_id": "64f8a1b2c3d4e5f6g7h8i9j3",
        "details": {
          "title": "Frontend Setup & Design",
          "description": "Create React app structure and implement design",
          "amount": 1250,
          "order": 1
        },
        "status": "pending",
        "timeline": {
          "deadline": "2024-02-15T23:59:59.000Z"
        }
      }
    ],
    "progress": 25
  }
}
```

### 9. Apply for Project
**POST** `/projects/:id/apply`

**Headers:**
```json
{
  "x-wallet-address": "0x742d35Cc6488C7b97d7B8DC8E6a4Eb61E9b6c2eC"
}
```

**Input:**
```json
{
  "coverLetter": "I have 5+ years of experience in full-stack development with React and Node.js. I've built similar e-commerce platforms and can deliver high-quality work within your timeline.",
  "proposedBudget": 4800,
  "proposedTimeline": 45,
  "milestoneBreakdown": [
    {
      "title": "Frontend Setup",
      "amount": 1200,
      "timeline": 10
    },
    {
      "title": "Backend Development",
      "amount": 1600,
      "timeline": 15
    },
    {
      "title": "Integration & Testing",
      "amount": 1000,
      "timeline": 10
    },
    {
      "title": "Deployment & Final Review",
      "amount": 1000,
      "timeline": 10
    }
  ]
}
```

**Response (201):**
```json
{
  "success": true,
  "data": {
    "application": {
      "_id": "64f8a1b2c3d4e5f6g7h8i9j2",
      "projectId": 42,
      "freelancer": {
        "wallet": "0x742d35cc6488c7b97d7b8dc8e6a4eb61e9b6c2ec",
        "displayName": "john_freelancer"
      },
      "proposal": {
        "coverLetter": "I have 5+ years of experience...",
        "proposedBudget": 4800,
        "proposedTimeline": 45,
        "milestoneBreakdown": [...]
      },
      "timestamps": {
        "submittedAt": "2024-01-15T15:30:00.000Z"
      }
    },
    "contractCall": {
      "contract": "FreelancePlatform",
      "method": "applyForProject",
      "params": [42, "QmProposalHash123"],
      "address": "0x1111111111111111111111111111111111111111"
    }
  },
  "message": "Application submitted successfully"
}
```

---

## Milestone Management Routes

### 10. Create Milestones
**POST** `/projects/:id/milestones`

**Headers:**
```json
{
  "x-wallet-address": "0xClient123Address456..."
}
```

**Input:**
```json
{
  "milestones": [
    {
      "title": "Frontend Setup & Design",
      "description": "Create React app structure, implement responsive design, and setup routing",
      "amount": 1250,
      "deadline": "2024-02-15T23:59:59.000Z"
    },
    {
      "title": "Backend Development",
      "description": "Develop REST APIs, database integration, and authentication system",
      "amount": 1750,
      "deadline": "2024-02-28T23:59:59.000Z"
    },
    {
      "title": "Payment Integration",
      "description": "Integrate Stripe payment gateway and implement checkout flow",
      "amount": 1000,
      "deadline": "2024-03-07T23:59:59.000Z"
    },
    {
      "title": "Testing & Deployment",
      "description": "Comprehensive testing, bug fixes, and production deployment",
      "amount": 1000,
      "deadline": "2024-03-15T23:59:59.000Z"
    }
  ],
  "txHash": "0xmilestone123hash456..."
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "project": {
      "_id": "64f8a1b2c3d4e5f6g7h8i9j1",
      "status": "active",
      "milestones": {
        "total": 4
      }
    },
    "milestones": [
      {
        "_id": "64f8a1b2c3d4e5f6g7h8i9j3",
        "projectId": 42,
        "details": {
          "title": "Frontend Setup & Design",
          "description": "Create React app structure...",
          "amount": 1250,
          "order": 1
        },
        "timeline": {
          "deadline": "2024-02-15T23:59:59.000Z"
        },
        "status": "pending"
      }
    ],
    "contractCall": {
      "contract": "FreelancePlatform",
      "method": "agreeMilestones",
      "params": [42, ["1250000000000000000000", "1750000000000000000000", "1000000000000000000000", "1000000000000000000000"], [1708041599, 1709164799, 1709769599, 1710547199], ["QmMilestone0", "QmMilestone1", "QmMilestone2", "QmMilestone3"]],
      "address": "0x1111111111111111111111111111111111111111"
    }
  },
  "message": "Milestones created successfully"
}
```

### 11. Submit Milestone Work
**POST** `/milestones/:id/submit`

**Headers:**
```json
{
  "x-wallet-address": "0x742d35Cc6488C7b97d7B8DC8E6a4Eb61E9b6c2eC"
}
```

**Input:**
```json
{
  "deliveryHash": "QmDeliveryHash123456...",
  "notes": "Frontend setup completed. Implemented responsive design with React, setup routing, and created all major components. The application is mobile-friendly and follows modern UI/UX principles.",
  "files": [
    {
      "name": "frontend-preview.png",
      "url": "https://ipfs.io/ipfs/QmPreview123...",
      "type": "image/png",
      "size": 2048576
    },
    {
      "name": "deployment-guide.pdf",
      "url": "https://ipfs.io/ipfs/QmGuide456...",
      "type": "application/pdf",
      "size": 512000
    }
  ]
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "milestone": {
      "_id": "64f8a1b2c3d4e5f6g7h8i9j3",
      "status": "submitted",
      "submission": {
        "deliveryHash": "QmDeliveryHash123456...",
        "notes": "Frontend setup completed...",
        "submittedAt": "2024-02-14T18:45:00.000Z",
        "attachments": [
          {
            "name": "frontend-preview.png",
            "url": "https://ipfs.io/ipfs/QmPreview123...",
            "type": "image/png",
            "size": 2048576
          }
        ]
      },
      "timeline": {
        "submittedAt": "2024-02-14T18:45:00.000Z"
      }
    },
    "contractCall": {
      "contract": "FreelancePlatform",
      "method": "submitMilestoneWork",
      "params": [1, "QmDeliveryHash123456...", "Frontend setup completed..."],
      "address": "0x1111111111111111111111111111111111111111"
    }
  },
  "message": "Milestone work submitted successfully"
}
```

### 12. Approve Milestone
**POST** `/milestones/:id/approve`

**Headers:**
```json
{
  "x-wallet-address": "0xClient123Address456..."
}
```

**Input:**
```json
{
  "rating": 5,
  "feedback": "Excellent work! The frontend is exactly what we wanted. Clean code, responsive design, and delivered on time. Looking forward to the next milestone."
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "milestone": {
      "_id": "64f8a1b2c3d4e5f6g7h8i9j3",
      "status": "approved",
      "approval": {
        "approvedBy": "0xclient123address456...",
        "approvedAt": "2024-02-15T09:30:00.000Z",
        "feedback": "Excellent work! The frontend is exactly what we wanted...",
        "rating": 5
      },
      "timeline": {
        "approvedAt": "2024-02-15T09:30:00.000Z"
      }
    },
    "contractCall": {
      "contract": "FreelancePlatform",
      "method": "approveMilestone",
      "params": [1],
      "address": "0x1111111111111111111111111111111111111111"
    }
  },
  "message": "Milestone approved successfully"
}
```

### 13. Release Payment
**POST** `/milestones/:id/release`

**Headers:**
```json
{
  "x-wallet-address": "0xClient123Address456..."
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "milestone": {
      "_id": "64f8a1b2c3d4e5f6g7h8i9j3",
      "status": "paid",
      "timeline": {
        "paidAt": "2024-02-15T10:00:00.000Z"
      }
    },
    "project": {
      "id": "64f8a1b2c3d4e5f6g7h8i9j1",
      "status": "active",
      "completedMilestones": 1,
      "totalMilestones": 4
    },
    "contractCall": {
      "contract": "FreelancePlatform",
      "method": "releaseMilestonePayment",
      "params": [1],
      "address": "0x1111111111111111111111111111111111111111"
    }
  },
  "message": "Payment released successfully"
}
```

### 14. Dispute Milestone
**POST** `/milestones/:id/dispute`

**Headers:**
```json
{
  "x-wallet-address": "0xClient123Address456..."
}
```

**Input:**
```json
{
  "reason": "The delivered work does not meet the requirements specified in the milestone. The responsive design is not working properly on mobile devices, and several key features are missing.",
  "category": "quality_issues",
  "evidence": [
    {
      "type": "screenshot",
      "url": "https://ipfs.io/ipfs/QmEvidence123...",
      "description": "Mobile layout broken on iPhone"
    },
    {
      "type": "document",
      "url": "https://ipfs.io/ipfs/QmEvidence456...",
      "description": "List of missing features"
    }
  ]
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "milestone": {
      "_id": "64f8a1b2c3d4e5f6g7h8i9j3",
      "status": "disputed",
      "dispute": {
        "raised": true,
        "raisedBy": "0xclient123address456...",
        "raisedAt": "2024-02-15T12:30:00.000Z",
        "reason": "The delivered work does not meet the requirements..."
      }
    },
    "dispute": {
      "_id": "64f8a1b2c3d4e5f6g7h8i9j4",
      "disputeId": "42-64f8a1b2c3d4e5f6g7h8i9j3-1708005000000",
      "projectId": 42,
      "milestoneId": 1,
      "parties": {
        "client": {
          "wallet": "0xclient123address456...",
          "displayName": "client_user123"
        },
        "freelancer": {
          "wallet": "0x742d35cc6488c7b97d7b8dc8e6a4eb61e9b6c2ec",
          "displayName": "john_freelancer"
        },
        "raisedBy": "0xclient123address456..."
      },
      "details": {
        "reason": "The delivered work does not meet the requirements...",
        "category": "quality_issues",
        "evidence": [...]
      }
    },
    "contractCall": {
      "contract": "FreelancePlatform",
      "method": "disputeMilestone",
      "params": [1],
      "address": "0x1111111111111111111111111111111111111111"
    }
  },
  "message": "Dispute raised successfully. Platform admin will review."
}
```

---

## User Dashboard & Analytics Routes

### 15. Get User Dashboard
**GET** `/users/:address/dashboard`

**Headers:**
```json
{
  "x-wallet-address": "0x742d35Cc6488C7b97d7B8DC8E6a4Eb61E9b6c2eC"
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "user": {
      "address": "0x742d35cc6488c7b97d7b8dc8e6a4eb61e9b6c2ec",
      "username": "john_freelancer",
      "role": "freelancer"
    },
    "statistics": {
      "projects": [
        { "_id": "completed", "count": 8, "totalValue": 24500 },
        { "_id": "active", "count": 2, "totalValue": 7000 },
        { "_id": "pending", "count": 1, "totalValue": 3000 }
      ],
      "earnings": {
        "totalEarned": 24500,
        "projectsCompleted": ["42", "38", "35", "29", "25", "21", "18", "15"]
      },
      "completedProjects": 8
    },
    "recentActivity": {
      "projects": [
        {
          "_id": "64f8a1b2c3d4e5f6g7h8i9j1",
          "title": "E-commerce Website Development",
          "status": "active",
          "budget": { "total": 5000 }
        }
      ],
      "applications": [
        {
          "_id": "64f8a1b2c3d4e5f6g7h8i9j2",
          "projectId": "64f8a1b2c3d4e5f6g7h8i9j5",
          "proposal": {
            "proposedBudget": 3500
          },
          "timestamps": {
            "submittedAt": "2024-01-14T16:20:00.000Z"
          }
        }
      ],
      "milestones": [
        {
          "_id": "64f8a1b2c3d4e5f6g7h8i9j6",
          "details": {
            "title": "Backend Development",
            "amount": 1750
          },
          "timeline": {
            "deadline": "2024-02-28T23:59:59.000Z"
          },
          "status": "pending"
        }
      ]
    },
    "notifications": [
      {
        "type": "milestone_due",
        "message": "You have milestones due soon",
        "count": 1,
        "timestamp": "2024-01-15T10:00:00.000Z"
      }
    ]
  }
}
```

### 16. Get User Projects
**GET** `/users/:address/projects?role=all&status=active&page=1&limit=10`

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "_id": "64f8a1b2c3d4e5f6g7h8i9j1",
      "title": "E-commerce Website Development",
      "status": "active",
      "budget": { "total": 5000 },
      "client": {
        "address": "0xclient123address456...",
        "displayName": "client_user123"
      },
      "freelancer": {
        "address": "0x742d35cc6488c7b97d7b8dc8e6a4eb61e9b6c2ec",
        "displayName": "john_freelancer"
      },
      "userRole": "freelancer",
      "createdAt": "2024-01-15T10:00:00.000Z"
    }
  ],
  "pagination": {
    "currentPage": 1,
    "totalPages": 2,
    "totalItems": 11,
    "itemsPerPage": 10
  }
}
```

### 17. Get User Reputation
**GET** `/users/:address/reputation`

**Response (200):**
```json
{
  "success": true,
  "data": {
    "address": "0x742d35cc6488c7b97d7b8dc8e6a4eb61e9b6c2ec",
    "database": {
      "totalProjects": 15,
      "completedProjects": 13,
      "totalEarned": 25500,
      "averageRating": 4.7,
      "totalRatings": 12,
      "projectsCompleted": 13,
      "successRate": 86.67
    },
    "blockchain": {
      "totalEarned": "25.5",
      "projectsCompleted": "13",
      "averageRating": "4.7",
      "totalRatings": "12",
      "hasNFT": false
    },
    "profile": {
      "bio": "Experienced web developer",
      "skills": ["React", "Node.js", "MongoDB", "TypeScript"]
    },
    "joinedAt": "2024-01-01T00:00:00.000Z",
    "lastActive": "2024-01-15T18:30:00.000Z"
  }
}
```

---

## Advanced Search & Analytics Routes

### 18. Advanced Project Search
**POST** `/projects/search`

**Input:**
```json
{
  "query": "e-commerce react node.js",
  "filters": {
    "category": "Web Development",
    "budget": {
      "min": 2000,
      "max": 10000
    },
    "skills": ["React", "Node.js"],
    "timeline": {
      "maxDays": 90
    }
  },
  "sort": {
    "budget.total": -1
  },
  "page": 1,
  "limit": 10
}
```

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "_id": "64f8a1b2c3d4e5f6g7h8i9j1",
      "title": "E-commerce Website Development",
      "description": "Need a full-stack e-commerce website with React frontend and Node.js backend...",
      "budget": { "total": 5000 },
      "category": "Web Development",
      "skills": ["React", "Node.js", "MongoDB", "Stripe"],
      "status": "open",
      "score": 2.1, // Text search relevance score
      "clientInfo": [
        {
          "username": "client_user123",
          "reputation": { "averageRating": 4.5 }
        }
      ],
      "applicationCount": [{ "count": 8 }],
      "timeline": {
        "deadline": "2024-03-15T23:59:59.000Z"
      }
    }
  ],
  "pagination": {
    "currentPage": 1,
    "totalPages": 3,
    "totalItems": 27,
    "itemsPerPage": 10
  },
  "searchInfo": {
    "query": "e-commerce react node.js",
    "filters": {
      "category": "Web Development",
      "budget": { "min": 2000, "max": 10000 }
    },
    "resultsFound": 27
  }
}
```

### 19. Get Platform Analytics
**GET** `/platform/analytics?period=30d`

**Response (200):**
```json
{
  "success": true,
  "data": {
    "period": "30d",
    "projects": {
      "totalProjects": [{ "count": 156 }],
      "projectsByStatus": [
        { "_id": "open", "count": 42 },
        { "_id": "active", "count": 28 },
        { "_id": "completed", "count": 78 },
        { "_id": "disputed", "count": 3 },
        { "_id": "cancelled", "count": 5 }
      ],
      "projectsByCategory": [
        { "_id": "Web Development", "count": 65 },
        { "_id": "Mobile Development", "count": 32 },
        { "_id": "Design", "count": 28 },
        { "_id": "Writing", "count": 18 },
        { "_id": "Other", "count": 13 }
      ],
      "recentProjects": [{ "count": 23 }],
      "totalVolume": [{ "total": 287500 }]
    },
    "users": {
      "totalUsers": [{ "count": 1247 }],
      "usersByRole": [
        { "_id": "freelancer", "count": 856 },
        { "_id": "client", "count": 378 },
        { "_id": "admin", "count": 13 }
      ],
      "activeUsers": [{ "count": 934 }],
      "newUsers": [{ "count": 45 }]
    },
    "transactions": {
      "totalTransactions": [{ "count": 342 }],
      "totalValue": [{ "total": 198650 }],
      "recentTransactions": [{ "count": 28, "value": 15750 }],
      "averageProjectValue": [{ "avg": 1847.5 }]
    },
    "topFreelancers": [
      {
        "_id": "0x742d35cc6488c7b97d7b8dc8e6a4eb61e9b6c2ec",
        "totalEarned": 12450,
        "projectsCompleted": 8,
        "milestonesCompleted": 32
      },
      {
        "_id": "0x987fcdeb51234567890abcdef123456789abcdef0",
        "totalEarned": 9875,
        "projectsCompleted": 6,
        "milestonesCompleted": 24
      }
    ],
    "generatedAt": "2024-01-15T20:00:00.000Z"
  }
}
```

### 20. Get Platform Statistics
**GET** `/platform/stats`

**Response (200):**
```json
{
  "success": true,
  "data": {
    "projects": {
      "total": 156,
      "active": 28,
      "completed": 78,
      "successRate": 50.0
    },
    "users": {
      "total": 1247,
      "freelancers": 856,
      "clients": 378
    },
    "platform": {
      "totalVolume": 287500,
      "totalTransactions": 342,
      "totalDisputes": 12,
      "disputeRate": 7.69
    },
    "activity": {
      "recentProjects": [
        {
          "id": 45,
          "title": "Mobile App Development",
          "budget": 8500,
          "status": "open",
          "client": "mobile_client456",
          "createdAt": "2024-01-15T19:30:00.000Z"
        }
      ],
      "recentTransactions": [
        {
          "type": "payment_released",
          "amount": 1250,
          "projectId": 42,
          "from": "0xclient123address456...",
          "to": "0x742d35cc6488c7b97d7b8dc8e6a4eb61e9b6c2ec",
          "timestamp": "2024-01-15T15:45:00.000Z"
        }
      ]
    },
    "blockchain": {
      "totalVolumeProcessed": "287.5",
      "totalFeesCollected": "14.375",
      "totalProjectsCompleted": "78",
      "activeProjects": "28",
      "onChainUsers": {
        "total": "1134",
        "clients": "367",
        "freelancers": "756",
        "admins": "11"
      }
    }
  }
}
```

---

## Admin Routes

### 21. Resolve Dispute (Admin)
**POST** `/admin/disputes/:id/resolve`

**Input:**
```json
{
  "winner": "0x742d35cc6488c7b97d7b8dc8e6a4eb61e9b6c2ec",
  "reasoning": "After reviewing the evidence, the freelancer has delivered work that meets the specified requirements. The mobile responsiveness issues mentioned by the client are minor and can be easily fixed with CSS adjustments. The core functionality is complete and working as expected.",
  "compensation": {
    "type": "full",
    "percentage": 100
  },
  "amount": "1250",
  "txHash": "0xdispute123resolution456...",
  "adminKey": "demo-admin-key"
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "dispute": {
      "_id": "64f8a1b2c3d4e5f6g7h8i9j4",
      "disputeId": "42-64f8a1b2c3d4e5f6g7h8i9j3-1708005000000",
      "resolution": {
        "status": "resolved",
        "winner": "0x742d35cc6488c7b97d7b8dc8e6a4eb61e9b6c2ec",
        "reasoning": "After reviewing the evidence, the freelancer has delivered work...",
        "amount": 1250,
        "resolvedBy": "admin",
        "resolvedAt": "2024-01-15T21:15:00.000Z"
      }
    },
    "milestone": {
      "_id": "64f8a1b2c3d4e5f6g7h8i9j3",
      "status": "paid",
      "dispute": {
        "resolved": true,
        "resolvedAt": "2024-01-15T21:15:00.000Z",
        "winner": "0x742d35cc6488c7b97d7b8dc8e6a4eb61e9b6c2ec"
      }
    },
    "project": {
      "_id": "64f8a1b2c3d4e5f6g7h8i9j1",
      "flags": {
        "isDisputed": false
      }
    },
    "transaction": {
      "_id": "64f8a1b2c3d4e5f6g7h8i9j7",
      "txHash": "0xdispute123resolution456...",
      "type": "dispute_resolved",
      "entities": {
        "projectId": 42,
        "milestoneId": 1,
        "from": "0xclient123address456...",
        "to": "0x742d35cc6488c7b97d7b8dc8e6a4eb61e9b6c2ec"
      },
      "amounts": {
        "amount": "1250",
        "value": 1250
      },
      "status": "confirmed"
    }
  },
  "message": "Dispute resolved in favor of freelancer",
  "contractCall": {
    "contract": "FreelancePlatform",
    "method": "resolveDispute",
    "params": [1, "0x742d35cc6488c7b97d7b8dc8e6a4eb61e9b6c2ec", "1250000000000000000000"],
    "address": "0x1111111111111111111111111111111111111111"
  }
}
```

### 22. Get All Disputes (Admin)
**GET** `/admin/disputes?status=open&page=1&limit=10`

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "_id": "64f8a1b2c3d4e5f6g7h8i9j4",
      "disputeId": "42-64f8a1b2c3d4e5f6g7h8i9j3-1708005000000",
      "projectId": 42,
      "milestoneId": 1,
      "parties": {
        "client": {
          "wallet": "0xclient123address456...",
          "displayName": "client_user123"
        },
        "freelancer": {
          "wallet": "0x742d35cc6488c7b97d7b8dc8e6a4eb61e9b6c2ec",
          "displayName": "john_freelancer"
        },
        "raisedBy": "0xclient123address456...",
        "againstAddress": "0x742d35cc6488c7b97d7b8dc8e6a4eb61e9b6c2ec"
      },
      "details": {
        "reason": "The delivered work does not meet the requirements specified...",
        "category": "quality_issues",
        "evidence": [
          {
            "type": "screenshot",
            "url": "https://ipfs.io/ipfs/QmEvidence123...",
            "description": "Mobile layout broken on iPhone"
          }
        ]
      },
      "resolution": {
        "status": "open"
      },
      "timeline": {
        "raisedAt": "2024-02-15T12:30:00.000Z"
      }
    }
  ],
  "pagination": {
    "currentPage": 1,
    "totalPages": 2,
    "totalItems": 12,
    "itemsPerPage": 10
  }
}
```

### 23. Sync Blockchain Data (Admin)
**POST** `/admin/sync-blockchain`

**Input:**
```json
{
  "adminKey": "demo-admin-key"
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "users": {
      "synced": 0,
      "errors": 0
    },
    "projects": {
      "synced": 45,
      "errors": 2
    },
    "milestones": {
      "synced": 0,
      "errors": 0
    }
  },
  "message": "Blockchain sync completed"
}
```

---

## Utility Routes

### 24. Health Check
**GET** `/health`

**Response (200):**
```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "database": {
      "connected": true,
      "collections": {
        "users": 1247,
        "projects": 156,
        "milestones": 412
      }
    },
    "blockchain": {
      "status": "connected",
      "contracts": {
        "freelancePlatform": {
          "address": "0x1111111111111111111111111111111111111111",
          "abi": [...]
        },
        "userRegistry": {
          "address": "0x2222222222222222222222222222222222222222",
          "abi": [...]
        }
      }
    },
    "timestamp": "2024-01-15T21:30:00.000Z"
  }
}
```

---

## Error Responses

All endpoints can return the following error formats:

### Validation Error (400)
```json
{
  "success": false,
  "error": "Username, email, password, and role are required",
  "details": "ValidationError: Path `username` is required."
}
```

### Authentication Error (401)
```json
{
  "success": false,
  "error": "Invalid admin credentials"
}
```

### Authorization Error (403)
```json
{
  "success": false,
  "error": "Can only update own profile"
}
```

### Not Found Error (404)
```json
{
  "success": false,
  "error": "User not found"
}
```

### Conflict Error (409)
```json
{
  "success": false,
  "error": "User already exists with this address, email, or username"
}
```

### Server Error (500)
```json
{
  "success": false,
  "error": "Operation failed",
  "details": "Database connection timeout"
}
```

---

## Complete User Flow Examples

### Flow 1: User Registration to Project Completion

1. **Freelancer Registration**
   ```
   POST /users/register
   → Creates user in DB
   → Returns blockchain transaction data
   → User executes blockchain transaction
   
   POST /users/:address/confirm
   → Confirms blockchain registration
   → Activates user account
   ```

2. **Client Creates Project**
   ```
   POST /projects
   → Creates project in DB
   → Returns blockchain transaction data
   → Client executes blockchain transaction
   
   POST /projects/:id/sync
   → Syncs project with blockchain
   → Project becomes "open"
   ```

3. **Freelancer Applies**
   ```
   POST /projects/:id/apply
   → Creates application in DB
   → Returns blockchain transaction data
   → Freelancer executes blockchain transaction
   ```

4. **Project Award & Milestone Creation**
   ```
   POST /projects/:id/milestones
   → Creates milestones in DB
   → Returns blockchain transaction data
   → Client executes blockchain transaction
   → Project becomes "active"
   ```

5. **Milestone Completion Cycle** (repeats for each milestone)
   ```
   POST /milestones/:id/submit
   → Freelancer submits work
   
   POST /milestones/:id/approve
   → Client approves work
   
   POST /milestones/:id/release
   → Client releases payment
   → Updates reputation
   → When all milestones paid, project becomes "completed"
   ```

### Flow 2: Dispute Resolution

1. **Dispute Raised**
   ```
   POST /milestones/:id/dispute
   → Creates dispute record
   → Milestone becomes "disputed"
   → Project flagged as disputed
   ```

2. **Admin Resolution**
   ```
   GET /admin/disputes
   → Admin reviews all open disputes
   
   POST /admin/disputes/:id/resolve
   → Admin resolves dispute
   → Updates milestone and project status
   → Records transaction
   ```

---

## Rate Limiting & Authentication Notes

- **Wallet Address**: Required in `x-wallet-address` header for most operations
- **Admin Operations**: Require `adminKey` in request body
- **Pagination**: Most list endpoints support `page` and `limit` parameters
- **Filtering**: Advanced filtering available on project search endpoints
- **Blockchain Integration**: Each operation returns `contractCall` object with transaction details

This API provides a complete freelance platform with blockchain integration, supporting the full project lifecycle from user registration to payment completion and dispute resolution.