#!/bin/bash

echo "========================================="
echo "Testing Marks Workflow"
echo "========================================="
echo ""

# Get tokens
echo "1. Getting authentication tokens..."
LECTURER_TOKEN=$(curl -s -X POST http://localhost:8000/api/v1/auth/login -H "Content-Type: application/json" -d '{"email":"lecturer1@university.edu","password":"admin123"}' | python -c "import sys, json; print(json.load(sys.stdin)['access_token'])")

HOD_TOKEN=$(curl -s -X POST http://localhost:8000/api/v1/auth/login -H "Content-Type: application/json" -d '{"email":"hod.cse@university.edu","password":"admin123"}' | python -c "import sys, json; print(json.load(sys.stdin)['access_token'])")

STUDENT_TOKEN=$(curl -s -X POST http://localhost:8000/api/v1/auth/login -H "Content-Type: application/json" -d '{"email":"student1@university.edu","password":"admin123"}' | python -c "import sys, json; print(json.load(sys.stdin)['access_token'])")

echo "   Lecturer token: ${LECTURER_TOKEN:0:50}..."
echo "   HOD token: ${HOD_TOKEN:0:50}..."
echo "   Student token: ${STUDENT_TOKEN:0:50}..."
echo ""

# Step 1: Lecturer submits marks
echo "2. Lecturer submitting marks..."
MARK_RESPONSE=$(curl -s -X POST http://localhost:8000/api/v1/marks \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $LECTURER_TOKEN" \
  -d '{"enrollment_id":1,"assessment_id":1,"marks_obtained":25,"is_absent":false}')

echo "$MARK_RESPONSE" | python -m json.tool
MARK_ID=$(echo "$MARK_RESPONSE" | python -c "import sys, json; print(json.load(sys.stdin).get('id', 'error'))" 2>/dev/null)

if [ "$MARK_ID" != "error" ]; then
    echo "   Mark ID: $MARK_ID"
    echo "   Status: PENDING"
else
    echo "   Error submitting marks!"
    exit 1
fi
echo ""

# Step 2: Student tries to view (should not see pending marks)
echo "3. Student trying to view pending marks..."
STUDENT_MARKS=$(curl -s http://localhost:8000/api/v1/marks -H "Authorization: Bearer $STUDENT_TOKEN")
COUNT=$(echo "$STUDENT_MARKS" | python -c "import sys, json; data=json.load(sys.stdin); print(len(data.get('items', [])))" 2>/dev/null)
echo "   Student can see $COUNT marks (should be 0)"
echo ""

# Step 3: HOD approves marks
echo "4. HOD approving marks..."
APPROVE_RESPONSE=$(curl -s -X PUT "http://localhost:8000/api/v1/marks/$MARK_ID/approve" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $HOD_TOKEN" \
  -d '{"comments":"Good work"}')

echo "$APPROVE_RESPONSE" | python -m json.tool | head -15
echo ""

# Step 4: Student views approved marks
echo "5. Student viewing approved marks..."
STUDENT_MARKS_AFTER=$(curl -s http://localhost:8000/api/v1/marks -H "Authorization: Bearer $STUDENT_TOKEN")
echo "$STUDENT_MARKS_AFTER" | python -m json.tool | head -20

echo ""
echo "========================================="
echo "Marks Workflow Test Complete!"
echo "========================================="
