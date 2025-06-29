import React, { useState, useEffect } from 'react'
import { supabase, validateFoodData, rateLimiter } from '../../lib/supabase'
import './Food.css'

const Food = () => {
  const [foods, setFoods] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingFood, setEditingFood] = useState(null)
  const [formData, setFormData] = useState({
    name: '',
    category: '',
    quantity: 0,
    unit: '',
    expiry_date: '',
    notes: ''
  })

  // Fetch all food items
  const fetchFoods = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('foods')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      setFoods(data || [])
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  // Create new food item with validation and rate limiting
  const createFood = async (foodData) => {
    try {
      // Rate limiting check
      if (!rateLimiter.isAllowed()) {
        throw new Error('Too many requests. Please wait a moment before trying again.')
      }

      // Validate data
      const validationErrors = validateFoodData(foodData)
      if (validationErrors.length > 0) {
        throw new Error(validationErrors.join(', '))
      }

      // Sanitize data
      const sanitizedData = {
        name: foodData.name.trim(),
        category: foodData.category?.trim() || null,
        quantity: Number(foodData.quantity) || 0,
        unit: foodData.unit?.trim() || null,
        expiry_date: foodData.expiry_date || null,
        notes: foodData.notes?.trim() || null
      }

      const { data, error } = await supabase
        .from('foods')
        .insert([sanitizedData])
        .select()

      if (error) throw error
      setFoods([...foods, ...data])
      return true
    } catch (err) {
      setError(err.message)
      return false
    }
  }

  // Update food item with validation
  const updateFood = async (id, foodData) => {
    try {
      // Rate limiting check
      if (!rateLimiter.isAllowed()) {
        throw new Error('Too many requests. Please wait a moment before trying again.')
      }

      // Validate data
      const validationErrors = validateFoodData(foodData)
      if (validationErrors.length > 0) {
        throw new Error(validationErrors.join(', '))
      }

      // Sanitize data
      const sanitizedData = {
        name: foodData.name.trim(),
        category: foodData.category?.trim() || null,
        quantity: Number(foodData.quantity) || 0,
        unit: foodData.unit?.trim() || null,
        expiry_date: foodData.expiry_date || null,
        notes: foodData.notes?.trim() || null
      }

      const { data, error } = await supabase
        .from('foods')
        .update(sanitizedData)
        .eq('id', id)
        .select()

      if (error) throw error
      setFoods(foods.map(food => food.id === id ? data[0] : food))
      return true
    } catch (err) {
      setError(err.message)
      return false
    }
  }

  // Delete food item with confirmation
  const deleteFood = async (id) => {
    try {
      // Rate limiting check
      if (!rateLimiter.isAllowed()) {
        throw new Error('Too many requests. Please wait a moment before trying again.')
      }

      const { error } = await supabase
        .from('foods')
        .delete()
        .eq('id', id)

      if (error) throw error
      setFoods(foods.filter(food => food.id !== id))
      return true
    } catch (err) {
      setError(err.message)
      return false
    }
  }

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null) // Clear previous errors
    
    const success = editingFood 
      ? await updateFood(editingFood.id, formData)
      : await createFood(formData)

    if (success) {
      closeModal()
    }
  }

  // Handle input changes with basic sanitization
  const handleInputChange = (e) => {
    const { name, value } = e.target
    
    // Basic input sanitization
    let sanitizedValue = value
    if (typeof value === 'string') {
      sanitizedValue = value.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // Remove script tags
    }
    
    setFormData(prev => ({
      ...prev,
      [name]: sanitizedValue
    }))
  }

  // Open modal for creating/editing
  const openModal = (food = null) => {
    setError(null) // Clear errors when opening modal
    setEditingFood(food)
    setFormData(food || {
      name: '',
      category: '',
      quantity: 0,
      unit: '',
      expiry_date: '',
      notes: ''
    })
    setIsModalOpen(true)
  }

  // Close modal
  const closeModal = () => {
    setIsModalOpen(false)
    setEditingFood(null)
    setError(null) // Clear errors when closing
    setFormData({
      name: '',
      category: '',
      quantity: 0,
      unit: '',
      expiry_date: '',
      notes: ''
    })
  }

  // Handle delete with confirmation
  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this item?')) {
      setError(null) // Clear previous errors
      await deleteFood(id)
    }
  }

  // Format date for display
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A'
    return new Date(dateString).toLocaleDateString()
  }

  // Check if item is expiring soon (within 7 days)
  const isExpiringSoon = (expiryDate) => {
    if (!expiryDate) return false
    const today = new Date()
    const expiry = new Date(expiryDate)
    const diffTime = expiry - today
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    return diffDays <= 7 && diffDays >= 0
  }

  // Check if item is expired
  const isExpired = (expiryDate) => {
    if (!expiryDate) return false
    const today = new Date()
    const expiry = new Date(expiryDate)
    return expiry < today
  }

  useEffect(() => {
    fetchFoods()
  }, [])

  if (loading) return <div className="loading">Loading...</div>

  return (
    <div className="food-inventory">
      <div className="food-header">
        <h1>Food Inventory</h1>
        <button className="btn btn-primary" onClick={() => openModal()}>
          Add New Item
        </button>
      </div>

      {error && (
        <div className="error-message">
          {error}
        </div>
      )}

      <div className="food-grid">
        {foods.map((food) => (
          <div 
            key={food.id} 
            className={`food-card ${isExpired(food.expiry_date) ? 'expired' : isExpiringSoon(food.expiry_date) ? 'expiring-soon' : ''}`}
          >
            <div className="food-card-header">
              <h3>{food.name}</h3>
              <div className="food-actions">
                <button 
                  className="btn btn-edit"
                  onClick={() => openModal(food)}
                >
                  Edit
                </button>
                <button 
                  className="btn btn-delete"
                  onClick={() => handleDelete(food.id)}
                >
                  Delete
                </button>
              </div>
            </div>
            
            <div className="food-details">
              <p><strong>Category:</strong> {food.category || 'N/A'}</p>
              <p><strong>Quantity:</strong> {food.quantity} {food.unit || ''}</p>
              <p><strong>Expiry Date:</strong> {formatDate(food.expiry_date)}</p>
              {food.notes && <p><strong>Notes:</strong> {food.notes}</p>}
            </div>

            {isExpired(food.expiry_date) && (
              <div className="status-badge expired-badge">Expired</div>
            )}
            {isExpiringSoon(food.expiry_date) && !isExpired(food.expiry_date) && (
              <div className="status-badge warning-badge">Expires Soon</div>
            )}
          </div>
        ))}
      </div>

      {foods.length === 0 && !loading && (
        <div className="empty-state">
          <p>No food items found. Add your first item to get started!</p>
        </div>
      )}

      {/* Modal */}
      {isModalOpen && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editingFood ? 'Edit Food Item' : 'Add New Food Item'}</h2>
              <button className="close-btn" onClick={closeModal}>&times;</button>
            </div>

            <form onSubmit={handleSubmit} className="food-form">
              <div className="form-group">
                <label htmlFor="name">Name *</label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  maxLength="255"
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="category">Category</label>
                <select
                  id="category"
                  name="category"
                  value={formData.category}
                  onChange={handleInputChange}
                >
                  <option value="">Select Category</option>
                  <option value="Fruits">Fruits</option>
                  <option value="Vegetables">Vegetables</option>
                  <option value="Dairy">Dairy</option>
                  <option value="Meat">Meat</option>
                  <option value="Grains">Grains</option>
                  <option value="Snacks">Snacks</option>
                  <option value="Beverages">Beverages</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="quantity">Quantity</label>
                  <input
                    type="number"
                    id="quantity"
                    name="quantity"
                    value={formData.quantity}
                    onChange={handleInputChange}
                    min="0"
                    max="999999"
                    step="0.1"
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="unit">Unit</label>
                  <select
                    id="unit"
                    name="unit"
                    value={formData.unit}
                    onChange={handleInputChange}
                  >
                    <option value="">Select Unit</option>
                    <option value="pieces">Pieces</option>
                    <option value="kg">Kilograms</option>
                    <option value="g">Grams</option>
                    <option value="L">Liters</option>
                    <option value="ml">Milliliters</option>
                    <option value="cups">Cups</option>
                    <option value="tbsp">Tablespoons</option>
                    <option value="tsp">Teaspoons</option>
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="expiry_date">Expiry Date</label>
                <input
                  type="date"
                  id="expiry_date"
                  name="expiry_date"
                  value={formData.expiry_date}
                  onChange={handleInputChange}
                />
              </div>

              <div className="form-group">
                <label htmlFor="notes">Notes</label>
                <textarea
                  id="notes"
                  name="notes"
                  value={formData.notes}
                  onChange={handleInputChange}
                  maxLength="1000"
                  rows="3"
                  placeholder="Additional notes about this item..."
                />
              </div>

              <div className="form-actions">
                <button type="button" className="btn btn-secondary" onClick={closeModal}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  {editingFood ? 'Update' : 'Add'} Item
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default Food