import React, { useRef, useState } from 'react';
import { createPost } from '../../../services/communityService';
import { useAuth } from '../../../context/AuthContext';
import '../../CommunityBoard.css';

const postTypes = [
  { value: 'lost-item', label: '🔍 Lost Item' },
  { value: 'found-item', label: '✅ Found Item' },
  { value: 'announcement', label: '📢 Announcement' },
  { value: 'event', label: '🎉 Event' },
  { value: 'help-request', label: '🆘 Help Request' },
  { value: 'idea-tip', label: '💡 Idea / Tip' }
];

const defaultCategoryByType = {
  'lost-item': 'Lost & Found',
  'found-item': 'Lost & Found',
  announcement: 'Announcements',
  event: 'Campus Events',
  'help-request': 'Student Support',
  'idea-tip': 'Academic Tips'
};

const typeSpecificDefaults = {
  'lost-item': { itemColor: '', lostDate: '', reward: '' },
  'found-item': { itemCondition: '', foundDate: '', handoverPoint: '' },
  announcement: { audience: 'All Students', priority: 'Normal' },
  event: { eventDate: '', eventTime: '', venue: '' },
  'help-request': { urgency: 'Medium', needBy: '', preferredHelp: '' },
  'idea-tip': { tipTopic: '', resourceLink: '' }
};

const CreatePostModal = ({ onClose, onPostCreated }) => {
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    type: 'lost-item',
    category: '',
    tags: '',
    location: '',
    contactInfo: ''
  });
  const [selectedImage, setSelectedImage] = useState(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [typeFields, setTypeFields] = useState(typeSpecificDefaults['lost-item']);
  const fileInputRef = useRef(null);

  const handleChange = (e) => {
    const { name, value } = e.target;

    if (name === 'type') {
      setFormData((prev) => ({
        ...prev,
        type: value,
        category: defaultCategoryByType[value] || prev.category
      }));
      setTypeFields(typeSpecificDefaults[value] || {});
      return;
    }

    setFormData((prev) => ({
      ...prev,
      [name]: value
    }));
  };

  const handleTypeFieldChange = (event) => {
    const { name, value } = event.target;
    setTypeFields((prev) => ({
      ...prev,
      [name]: value
    }));
  };

  const validateTypeSpecificFields = () => {
    if (formData.type === 'event') {
      if (!typeFields.eventDate || !typeFields.eventTime || !typeFields.venue?.trim()) {
        return 'Event posts require date, time, and venue.';
      }
    }

    if (formData.type === 'help-request') {
      if (!typeFields.preferredHelp?.trim()) {
        return 'Help request posts require preferred help details.';
      }
    }

    return '';
  };

  const buildTypeSpecificNote = () => {
    if (formData.type === 'lost-item') {
      return [
        typeFields.itemColor ? `Item color: ${typeFields.itemColor}` : '',
        typeFields.lostDate ? `Lost date: ${typeFields.lostDate}` : '',
        typeFields.reward ? `Reward: ${typeFields.reward}` : ''
      ].filter(Boolean).join(' | ');
    }

    if (formData.type === 'found-item') {
      return [
        typeFields.itemCondition ? `Item condition: ${typeFields.itemCondition}` : '',
        typeFields.foundDate ? `Found date: ${typeFields.foundDate}` : '',
        typeFields.handoverPoint ? `Handover point: ${typeFields.handoverPoint}` : ''
      ].filter(Boolean).join(' | ');
    }

    if (formData.type === 'announcement') {
      return [
        typeFields.audience ? `Audience: ${typeFields.audience}` : '',
        typeFields.priority ? `Priority: ${typeFields.priority}` : ''
      ].filter(Boolean).join(' | ');
    }

    if (formData.type === 'event') {
      return [
        typeFields.eventDate ? `Event date: ${typeFields.eventDate}` : '',
        typeFields.eventTime ? `Event time: ${typeFields.eventTime}` : '',
        typeFields.venue ? `Venue: ${typeFields.venue}` : ''
      ].filter(Boolean).join(' | ');
    }

    if (formData.type === 'help-request') {
      return [
        typeFields.urgency ? `Urgency: ${typeFields.urgency}` : '',
        typeFields.needBy ? `Need by: ${typeFields.needBy}` : '',
        typeFields.preferredHelp ? `Preferred help: ${typeFields.preferredHelp}` : ''
      ].filter(Boolean).join(' | ');
    }

    if (formData.type === 'idea-tip') {
      return [
        typeFields.tipTopic ? `Tip topic: ${typeFields.tipTopic}` : '',
        typeFields.resourceLink ? `Resource: ${typeFields.resourceLink}` : ''
      ].filter(Boolean).join(' | ');
    }

    return '';
  };

  const handleImageSelection = (file) => {
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('Only image files are allowed');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError('Image size must be less than 5MB');
      return;
    }

    setError('');
    setSelectedImage(file);
    setPreviewUrl(URL.createObjectURL(file));
  };

  const handleDragOver = (event) => {
    event.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (event) => {
    event.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (event) => {
    event.preventDefault();
    setIsDragging(false);
    const file = event.dataTransfer.files?.[0];
    handleImageSelection(file);
  };

  const removeSelectedImage = () => {
    setSelectedImage(null);
    setPreviewUrl('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.title.trim() || !formData.description.trim()) {
      setError('Title and description are required');
      return;
    }

    if (!user || !user._id) {
      setError('You must be logged in to create a post');
      return;
    }

    const typeValidationError = validateTypeSpecificFields();
    if (typeValidationError) {
      setError(typeValidationError);
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      const postPayload = new FormData();
      const typeSpecificNote = buildTypeSpecificNote();
      const enrichedDescription = typeSpecificNote
        ? `${formData.description}\n\n${typeSpecificNote}`
        : formData.description;

      const derivedTags = Object.values(typeFields)
        .filter(Boolean)
        .map((value) => String(value).trim())
        .filter((value) => value && value.length <= 30);

      postPayload.append('title', formData.title);
      postPayload.append('description', enrichedDescription);
      postPayload.append('type', formData.type);
      postPayload.append('category', formData.category || defaultCategoryByType[formData.type] || 'General');
      postPayload.append('location', formData.location);
      postPayload.append('contactInfo', formData.contactInfo);
      postPayload.append(
        'tags',
        JSON.stringify(
          [...(formData.tags
            ? formData.tags.split(',').map((tag) => tag.trim()).filter(Boolean)
            : []), ...derivedTags]
        )
      );
      postPayload.append('userId', user._id);
      postPayload.append('userName', user.name);
      postPayload.append('userEmail', user.email);

      if (selectedImage) {
        postPayload.append('image', selectedImage);
      }

      await createPost(postPayload);
      onPostCreated();
    } catch (err) {
      setError(err.message || 'Failed to create post');
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content create-post-modal" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>✕</button>
        
        <h2>Create New Post</h2>
        
        {error && <div className="error-message">{error}</div>}

        <form onSubmit={handleSubmit} className="create-post-form">
          {/* Post Type */}
          <div className="form-group">
            <label>Post Type *</label>
            <select
              name="type"
              value={formData.type}
              onChange={handleChange}
              className="form-control"
            >
              {postTypes.map(type => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </div>

          {/* Title */}
          <div className="form-group">
            <label>Title *</label>
            <input
              type="text"
              name="title"
              value={formData.title}
              onChange={handleChange}
              placeholder="e.g., Blue Water Bottle Lost"
              className="form-control"
              maxLength="200"
            />
          </div>

          {/* Description */}
          <div className="form-group">
            <label>Description *</label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              placeholder="Provide details..."
              className="form-control"
              rows="4"
            />
          </div>

          <div className="type-specific-section">
            <h3>Category-Specific Details</h3>

            {(formData.type === 'lost-item') && (
              <div className="type-specific-grid">
                <div className="form-group">
                  <label>Item Color</label>
                  <input
                    type="text"
                    name="itemColor"
                    value={typeFields.itemColor || ''}
                    onChange={handleTypeFieldChange}
                    placeholder="e.g., Blue"
                    className="form-control"
                  />
                </div>
                <div className="form-group">
                  <label>Lost Date</label>
                  <input
                    type="date"
                    name="lostDate"
                    value={typeFields.lostDate || ''}
                    onChange={handleTypeFieldChange}
                    className="form-control"
                  />
                </div>
                <div className="form-group">
                  <label>Reward (optional)</label>
                  <input
                    type="text"
                    name="reward"
                    value={typeFields.reward || ''}
                    onChange={handleTypeFieldChange}
                    placeholder="e.g., Rs. 1000"
                    className="form-control"
                  />
                </div>
              </div>
            )}

            {(formData.type === 'found-item') && (
              <div className="type-specific-grid">
                <div className="form-group">
                  <label>Item Condition</label>
                  <input
                    type="text"
                    name="itemCondition"
                    value={typeFields.itemCondition || ''}
                    onChange={handleTypeFieldChange}
                    placeholder="e.g., Slightly scratched"
                    className="form-control"
                  />
                </div>
                <div className="form-group">
                  <label>Found Date</label>
                  <input
                    type="date"
                    name="foundDate"
                    value={typeFields.foundDate || ''}
                    onChange={handleTypeFieldChange}
                    className="form-control"
                  />
                </div>
                <div className="form-group">
                  <label>Handover Point</label>
                  <input
                    type="text"
                    name="handoverPoint"
                    value={typeFields.handoverPoint || ''}
                    onChange={handleTypeFieldChange}
                    placeholder="e.g., Student Affairs Office"
                    className="form-control"
                  />
                </div>
              </div>
            )}

            {(formData.type === 'announcement') && (
              <div className="type-specific-grid">
                <div className="form-group">
                  <label>Audience</label>
                  <select
                    name="audience"
                    value={typeFields.audience || 'All Students'}
                    onChange={handleTypeFieldChange}
                    className="form-control"
                  >
                    <option>All Students</option>
                    <option>First Year</option>
                    <option>Final Year</option>
                    <option>Department Specific</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Priority</label>
                  <select
                    name="priority"
                    value={typeFields.priority || 'Normal'}
                    onChange={handleTypeFieldChange}
                    className="form-control"
                  >
                    <option>Normal</option>
                    <option>Important</option>
                    <option>Critical</option>
                  </select>
                </div>
              </div>
            )}

            {(formData.type === 'event') && (
              <div className="type-specific-grid">
                <div className="form-group">
                  <label>Event Date *</label>
                  <input
                    type="date"
                    name="eventDate"
                    value={typeFields.eventDate || ''}
                    onChange={handleTypeFieldChange}
                    className="form-control"
                  />
                </div>
                <div className="form-group">
                  <label>Event Time *</label>
                  <input
                    type="time"
                    name="eventTime"
                    value={typeFields.eventTime || ''}
                    onChange={handleTypeFieldChange}
                    className="form-control"
                  />
                </div>
                <div className="form-group">
                  <label>Venue *</label>
                  <input
                    type="text"
                    name="venue"
                    value={typeFields.venue || ''}
                    onChange={handleTypeFieldChange}
                    placeholder="e.g., Main Auditorium"
                    className="form-control"
                  />
                </div>
              </div>
            )}

            {(formData.type === 'help-request') && (
              <div className="type-specific-grid">
                <div className="form-group">
                  <label>Urgency</label>
                  <select
                    name="urgency"
                    value={typeFields.urgency || 'Medium'}
                    onChange={handleTypeFieldChange}
                    className="form-control"
                  >
                    <option>Low</option>
                    <option>Medium</option>
                    <option>High</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Need By</label>
                  <input
                    type="date"
                    name="needBy"
                    value={typeFields.needBy || ''}
                    onChange={handleTypeFieldChange}
                    className="form-control"
                  />
                </div>
                <div className="form-group">
                  <label>Preferred Help *</label>
                  <input
                    type="text"
                    name="preferredHelp"
                    value={typeFields.preferredHelp || ''}
                    onChange={handleTypeFieldChange}
                    placeholder="e.g., Need tutor for Java"
                    className="form-control"
                  />
                </div>
              </div>
            )}

            {(formData.type === 'idea-tip') && (
              <div className="type-specific-grid">
                <div className="form-group">
                  <label>Tip Topic</label>
                  <input
                    type="text"
                    name="tipTopic"
                    value={typeFields.tipTopic || ''}
                    onChange={handleTypeFieldChange}
                    placeholder="e.g., Exam preparation"
                    className="form-control"
                  />
                </div>
                <div className="form-group">
                  <label>Resource Link</label>
                  <input
                    type="text"
                    name="resourceLink"
                    value={typeFields.resourceLink || ''}
                    onChange={handleTypeFieldChange}
                    placeholder="https://..."
                    className="form-control"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Location */}
          <div className="form-group">
            <label>Location</label>
            <input
              type="text"
              name="location"
              value={formData.location}
              onChange={handleChange}
              placeholder="e.g., Library, Engineering Building"
              className="form-control"
            />
          </div>

          {/* Contact Info */}
          <div className="form-group">
            <label>Contact Info</label>
            <input
              type="text"
              name="contactInfo"
              value={formData.contactInfo}
              onChange={handleChange}
              placeholder="Phone or email"
              className="form-control"
            />
          </div>

          {/* Tags */}
          <div className="form-group">
            <label>Tags (comma-separated)</label>
            <input
              type="text"
              name="tags"
              value={formData.tags}
              onChange={handleChange}
              placeholder="e.g., blue, bottle, water"
              className="form-control"
            />
          </div>

          {/* Category */}
          <div className="form-group">
            <label>Category</label>
            <input
              type="text"
              name="category"
              value={formData.category}
              onChange={handleChange}
              placeholder="e.g., Personal Items, Campus"
              className="form-control"
            />
          </div>

          {/* Image Upload */}
          <div className="form-group">
            <label>Image Upload (Optional)</label>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="file-input-hidden"
              onChange={(event) => handleImageSelection(event.target.files?.[0])}
            />
            <div
              className={`image-dropzone ${isDragging ? 'dragging' : ''}`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              <p>Drag and drop an image here, or click to browse</p>
              <small>PNG, JPG, GIF, WEBP up to 5MB</small>
            </div>

            {previewUrl && (
              <div className="image-preview-wrap">
                <img src={previewUrl} alt="Preview" className="image-preview" />
                <button
                  type="button"
                  className="btn-cancel image-remove-btn"
                  onClick={removeSelectedImage}
                >
                  Remove image
                </button>
              </div>
            )}

            {!previewUrl && (
            <input
              type="text"
              value="No image selected"
              readOnly
              className="form-control"
            />
            )}
          </div>

          {/* Buttons */}
          <div className="form-actions">
            <button 
              type="button" 
              className="btn-cancel"
              onClick={onClose}
            >
              Cancel
            </button>
            <button 
              type="submit" 
              className="btn-primary"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Creating...' : 'Create Post'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreatePostModal;
