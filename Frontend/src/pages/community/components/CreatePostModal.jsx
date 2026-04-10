import React, { useEffect, useRef, useState } from 'react';
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

const isValidHttpUrl = (value) => {
  try {
    const parsed = new URL(String(value || '').trim());
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
};

const getTodayIsoDate = () => new Date().toISOString().split('T')[0];

const isBeforeToday = (dateValue) => {
  if (!dateValue) return false;
  return dateValue < getTodayIsoDate();
};

const isAfterToday = (dateValue) => {
  if (!dateValue) return false;
  return dateValue > getTodayIsoDate();
};

const CreatePostModal = ({ onClose, onPostCreated }) => {
  const { user } = useAuth();
  const isAdmin = ['admin', 'teacher'].includes(String(user?.role || '').toLowerCase());
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    type: 'lost-item',
    category: '',
    tags: '',
    location: '',
    contactInfo: ''
  });
  const [selectedImages, setSelectedImages] = useState([]);
  const [previewUrls, setPreviewUrls] = useState([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [typeFields, setTypeFields] = useState(typeSpecificDefaults['lost-item']);
  const fileInputRef = useRef(null);

  const maxImageCount = isAdmin ? 5 : 1;

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

  useEffect(() => {
    const objectUrls = selectedImages.map((file) => URL.createObjectURL(file));
    setPreviewUrls(objectUrls);

    return () => {
      objectUrls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [selectedImages]);

  useEffect(() => {
    setSelectedImages((prev) => prev.slice(0, maxImageCount));
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [maxImageCount]);

  const validateTypeSpecificFields = () => {
    if (formData.type === 'lost-item' && typeFields.lostDate && isAfterToday(typeFields.lostDate)) {
      return 'Lost date cannot be in the future.';
    }

    if (formData.type === 'found-item' && typeFields.foundDate && isAfterToday(typeFields.foundDate)) {
      return 'Found date cannot be in the future.';
    }

    if (formData.type === 'event') {
      if (!typeFields.eventDate || !typeFields.eventTime || !typeFields.venue?.trim()) {
        return 'Event posts require date, time, and venue.';
      }

      if (isBeforeToday(typeFields.eventDate)) {
        return 'Event date cannot be in the past.';
      }
    }

    if (formData.type === 'help-request') {
      if (!typeFields.preferredHelp?.trim()) {
        return 'Help request posts require preferred help details.';
      }

      if (typeFields.needBy && isBeforeToday(typeFields.needBy)) {
        return 'Need-by date cannot be in the past.';
      }
    }

    if (formData.type === 'idea-tip' && typeFields.resourceLink?.trim() && !isValidHttpUrl(typeFields.resourceLink)) {
      return 'Resource link must start with http:// or https://';
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

  const handleImageSelection = (filesInput) => {
    const incomingFiles = Array.from(filesInput || []).filter(Boolean);
    if (incomingFiles.length === 0) return;

    const validFiles = [];
    for (const file of incomingFiles) {
      if (!file.type.startsWith('image/')) {
        setError('Only image files are allowed');
        return;
      }

      if (file.size > 5 * 1024 * 1024) {
        setError('Each image must be less than 5MB');
        return;
      }

      validFiles.push(file);
    }

    setError('');
    setSelectedImages((prev) => {
      const dedupeMap = new Map();
      [...prev, ...validFiles].forEach((file) => {
        const key = `${file.name}-${file.size}-${file.lastModified}`;
        dedupeMap.set(key, file);
      });

      const merged = Array.from(dedupeMap.values());
      if (merged.length > maxImageCount) {
        setError(`You can upload up to ${maxImageCount} image${maxImageCount > 1 ? 's' : ''} for this post type`);
      }
      return merged.slice(0, maxImageCount);
    });

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
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
    handleImageSelection(event.dataTransfer.files);
  };

  const removeSelectedImage = (index) => {
    setSelectedImages((prev) => prev.filter((_, itemIndex) => itemIndex !== index));
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const title = String(formData.title || '').trim();
    const description = String(formData.description || '').trim();
    const location = String(formData.location || '').trim();
    const contactInfo = String(formData.contactInfo || '').trim();
    const tags = String(formData.tags || '');
    const category = String(formData.category || '').trim();
    
    if (!title || !description) {
      setError('Title and description are required');
      return;
    }

    if (title.length < 3) {
      setError('Title must be at least 3 characters long');
      return;
    }

    if (description.length < 10) {
      setError('Description must be at least 10 characters long');
      return;
    }

    if (contactInfo && contactInfo.length < 5) {
      setError('Contact info looks too short. Add a valid phone or email.');
      return;
    }

    if (location && location.length < 2) {
      setError('Location must be at least 2 characters long.');
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

      postPayload.append('title', title);
      postPayload.append('description', enrichedDescription);
      postPayload.append('type', formData.type);
      postPayload.append('category', category || defaultCategoryByType[formData.type] || 'General');
      postPayload.append('location', location);
      postPayload.append('contactInfo', contactInfo);
      postPayload.append(
        'tags',
        JSON.stringify(
          [...(tags
            ? tags.split(',').map((tag) => tag.trim()).filter(Boolean)
            : []), ...derivedTags]
        )
      );
      postPayload.append('userId', user._id);
      postPayload.append('userName', user.name);
      postPayload.append('userEmail', user.email);
      postPayload.append('userRole', user.role || '');

      selectedImages.forEach((file) => {
        postPayload.append('images', file);
      });

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
              minLength={3}
              required
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
              minLength={10}
              required
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
                    max={getTodayIsoDate()}
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
                    max={getTodayIsoDate()}
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
                    min={getTodayIsoDate()}
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
                    min={getTodayIsoDate()}
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
                    pattern="https?://.+"
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
              multiple={maxImageCount > 1}
              className="file-input-hidden"
              onChange={(event) => handleImageSelection(event.target.files)}
            />
            <div
              className={`image-dropzone ${isDragging ? 'dragging' : ''}`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              <p>
                {maxImageCount > 1
                  ? `Drag and drop up to ${maxImageCount} images, or click to browse`
                  : 'Drag and drop an image here, or click to browse'}
              </p>
              <small>PNG, JPG, GIF, WEBP up to 5MB each</small>
            </div>

            {previewUrls.length > 0 && (
              <>
                <div className="image-preview-grid">
                  {previewUrls.map((url, index) => (
                    <div key={url} className="image-preview-tile">
                      <img src={url} alt={`Preview ${index + 1}`} className="image-preview" />
                      <button
                        type="button"
                        className="btn-cancel image-remove-btn"
                        onClick={() => removeSelectedImage(index)}
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
                <small className="image-selection-note">
                  {selectedImages.length} / {maxImageCount} image{maxImageCount > 1 ? 's' : ''} selected
                </small>
              </>
            )}

            {previewUrls.length === 0 && (
              <input
                type="text"
                value="No image selected"
                readOnly
                className="form-control"
              />
            )}

            {isAdmin && (
              <small className="image-selection-note">
                Admin posts support up to 5 images.
              </small>
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
