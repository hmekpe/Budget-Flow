"""
Budget-Flow Backend Server
Personal Finance Management API
"""

from flask import Flask, jsonify, request, send_from_directory, make_response
from flask_cors import CORS
import json
from datetime import datetime
import os

app = Flask(__name__)
CORS(app)

# Disable caching for all routes
@app.after_request
def add_header(response):
    response.headers['Cache-Control'] = 'no-cache, no-store, must-revalidate'
    response.headers['Pragma'] = 'no-cache'
    response.headers['Expires'] = '0'
    return response

# Serve static files from multiple directories
@app.route('/')
def serve_index():
    response = make_response(send_from_directory('.', 'index.html'))
    return response

@app.route('/css/<path:filename>')
def serve_css(filename):
    response = make_response(send_from_directory('css', filename))
    return response

@app.route('/js/<path:filename>')
def serve_js(filename):
    response = make_response(send_from_directory('js', filename))
    return response

@app.route('/assests/<path:filename>')
def serve_assests(filename):
    response = make_response(send_from_directory('assests', filename))
    return response

@app.route('/pages/<path:filename>')
def serve_pages(filename):
    response = make_response(send_from_directory('pages', filename))
    return response

@app.route('/settings')
def serve_settings():
    response = make_response(send_from_directory('.', 'settings-screen.html'))
    return response

@app.route('/settings-screen.html')
def serve_settings_html():
    response = make_response(send_from_directory('.', 'settings-screen.html'))
    return response

# In-memory data storage (can be replaced with SQLite database)
categories = [
    {"label": "Food & Drinks", "emoji": "🍔"},
    {"label": "Transport", "emoji": "🚗"},
    {"label": "Shopping", "emoji": "🛍️"},
    {"label": "Health", "emoji": "💊"},
    {"label": "Entertainment", "emoji": "🎬"},
    {"label": "Other", "emoji": "📌"},
]

week_days = [
    {"label": "Mon", "amount": 25},
    {"label": "Tue", "amount": 75},
    {"label": "Wed", "amount": 100},
    {"label": "Thu", "amount": 50},
    {"label": "Fri", "amount": 100},
    {"label": "Sat", "amount": 100},
    {"label": "Sun", "amount": 50},
]

budget_categories = [
    {"emoji": "🍔", "name": "Food and Drinks", "spent": 59, "budget": 300, "color": "#816DBC"},
    {"emoji": "🚗", "name": "Transport", "spent": 19, "budget": 150, "color": "#DE5C5C"},
    {"emoji": "🎬", "name": "Entertainment", "spent": 16, "budget": 100, "color": "#E7AEAE"},
    {"emoji": "📄", "name": "Bills", "spent": 120, "budget": 200, "color": "#4CAF81"},
    {"emoji": "💊", "name": "Medication", "spent": 25, "budget": 200, "color": "#4ade80"},
    {"emoji": "📚", "name": "Education", "spent": 25, "budget": 100, "color": "#ff6b6b"},
    {"emoji": "🚀", "name": "Others", "spent": 200, "budget": 350, "color": "#7D63CC"},
]

# Transaction storage
transactions = [
    {"id": 1, "date": "Mar 3, 2026", "category": "Food & Drinks", "name": "Grocery Store", "emoji": "🍔", "amount": -52.3},
    {"id": 2, "date": "Mar 4, 2026", "category": "Transport", "name": "Uber Ride", "emoji": "🚗", "amount": -18.5},
    {"id": 3, "date": "Mar 6, 2026", "category": "Other", "name": "Salary", "emoji": "🚀", "amount": 4200.0},
]

all_transactions = [
    {"id": 1, "name": "Grocery Store", "category": "Food & Drinks", "emoji": "🍔", "amount": -52.30, "type": "expense"},
    {"id": 2, "name": "Uber Ride", "category": "Transport", "emoji": "🚗", "amount": -18.50, "type": "expense"},
    {"id": 3, "name": "Salary", "category": "Other", "emoji": "🚀", "amount": 5000.00, "type": "income"},
    {"id": 4, "name": "Netflix", "category": "Entertainment", "emoji": "🎬", "amount": -15.99, "type": "expense"},
    {"id": 5, "name": "Electric Bill", "category": "Bills", "emoji": "📄", "amount": -89.00, "type": "expense"},
    {"id": 6, "name": "Pharmacy", "category": "Health", "emoji": "💊", "amount": -24.50, "type": "expense"},
    {"id": 7, "name": "Coffee Shop", "category": "Food & Drinks", "emoji": "☕", "amount": -6.80, "type": "expense"},
    {"id": 8, "name": "Education", "category": "Education", "emoji": "📚", "amount": -6.80, "type": "expense"},
]

# API Routes

@app.route('/api/categories', methods=['GET'])
def get_categories():
    """Get all transaction categories"""
    return jsonify(categories)

@app.route('/api/week-days', methods=['GET'])
def get_week_days():
    """Get weekly spending data"""
    return jsonify(week_days)

@app.route('/api/budget-categories', methods=['GET'])
def get_budget_categories():
    """Get budget categories with spending"""
    return jsonify(budget_categories)

@app.route('/api/transactions', methods=['GET'])
def get_transactions():
    """Get all transactions (for add transaction page)"""
    return jsonify(transactions)

@app.route('/api/all-transactions', methods=['GET'])
def get_all_transactions():
    """Get all transactions (for activity page)"""
    return jsonify(all_transactions)

@app.route('/api/transactions', methods=['POST'])
def add_transaction():
    """Add a new transaction"""
    data = request.get_json()
    
    new_tx = {
        "id": int(datetime.now().timestamp()),
        "date": data.get('date', datetime.now().strftime("%b %d, %Y")),
        "category": data.get('category', ''),
        "name": data.get('name', data.get('category', '')),
        "emoji": data.get('emoji', '📌'),
        "amount": float(data.get('amount', 0)),
    }
    
    transactions.insert(0, new_tx)
    
    # Also add to all_transactions for activity view
    tx_type = "income" if new_tx['amount'] > 0 else "expense"
    all_tx = {
        "id": new_tx['id'],
        "name": new_tx['name'],
        "category": new_tx['category'],
        "emoji": new_tx['emoji'],
        "amount": new_tx['amount'],
        "type": tx_type
    }
    all_transactions.insert(0, all_tx)
    
    return jsonify({"success": True, "transaction": new_tx})

@app.route('/api/transactions/<int:tx_id>', methods=['DELETE'])
def delete_transaction(tx_id):
    """Delete a transaction"""
    global transactions, all_transactions
    
    transactions = [t for t in transactions if t['id'] != tx_id]
    all_transactions = [t for t in all_transactions if t['id'] != tx_id]
    
    return jsonify({"success": True})

@app.route('/api/summary', methods=['GET'])
def get_summary():
    """Get dashboard summary data"""
    total_expenses = sum(cat['spent'] for cat in budget_categories)
    total_income = 5000  # Default income
    total_budget = sum(cat['budget'] for cat in budget_categories)
    
    return jsonify({
        "totalExpenses": total_expenses,
        "totalIncome": total_income,
        "totalBudget": total_budget,
        "usedBudget": total_expenses
    })

@app.route('/api/dashboard', methods=['GET'])
def get_dashboard_data():
    """Get all dashboard data at once"""
    return jsonify({
        "categories": categories,
        "weekDays": week_days,
        "budgetCategories": budget_categories,
        "transactions": transactions,
        "allTransactions": all_transactions
    })

if __name__ == '__main__':
    print("Starting Budget-Flow Backend Server...")
    print("API available at http://localhost:5001")
    app.run(host='0.0.0.0', port=5001, debug=True)
