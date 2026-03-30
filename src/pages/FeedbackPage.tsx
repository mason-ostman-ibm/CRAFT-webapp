import React, { useState } from 'react';
import {
  Grid,
  Column,
  Heading,
  Stack,
  Form,
  TextInput,
  TextArea,
  Button,
  InlineNotification,
  Select,
  SelectItem,
} from '@carbon/react';
import { Chat } from '@carbon/icons-react';
import DisclaimerNotice from '../components/DisclaimerNotice';

const FeedbackPage: React.FC = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    category: '',
    subject: '',
    message: '',
  });
  const [submitted, setSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // Send feedback to backend
      const response = await fetch('/api/feedback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        setSubmitted(true);
        setFormData({
          name: '',
          email: '',
          category: '',
          subject: '',
          message: '',
        });
        
        // Reset success message after 5 seconds
        setTimeout(() => setSubmitted(false), 5000);
      } else {
        console.error('Failed to submit feedback');
      }
    } catch (error) {
      console.error('Error submitting feedback:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Grid className="page-content" fullWidth>
      <Column lg={16} md={8} sm={4}>
        <Stack gap={7}>
          <div className="cds--spacing-06">
            <div className="cds--type-heading-04" style={{ display: 'flex', alignItems: 'center', gap: 'var(--cds-spacing-05)' }}>
              <Chat size={32} />
              <span>Feedback</span>
            </div>
            <p className="cds--type-body-01 cds--spacing-05">
              We value your feedback! Help us improve CRAFT by sharing your thoughts, suggestions, or reporting issues.
            </p>
          </div>

          <DisclaimerNotice />

          {submitted && (
            <InlineNotification
              kind="success"
              title="Feedback Submitted"
              subtitle="Thank you for your feedback! We'll review it and get back to you if needed."
              lowContrast
              hideCloseButton={false}
              onCloseButtonClick={() => setSubmitted(false)}
            />
          )}

          <Grid narrow>
            <Column lg={12} md={8} sm={4}>
              <Form onSubmit={handleSubmit}>
                <Stack gap={6}>
                  <TextInput
                    id="name"
                    name="name"
                    labelText="Name"
                    placeholder="Enter your name"
                    value={formData.name}
                    onChange={handleInputChange}
                    required
                  />

                  <TextInput
                    id="email"
                    name="email"
                    type="email"
                    labelText="Email"
                    placeholder="your.email@ibm.com"
                    value={formData.email}
                    onChange={handleInputChange}
                    required
                  />

                  <Select
                    id="category"
                    name="category"
                    labelText="Category"
                    value={formData.category}
                    onChange={handleInputChange}
                    required
                  >
                    <SelectItem value="" text="Select a category" />
                    <SelectItem value="bug" text="Bug Report" />
                    <SelectItem value="feature" text="Feature Request" />
                    <SelectItem value="improvement" text="Improvement Suggestion" />
                    <SelectItem value="question" text="Question" />
                    <SelectItem value="other" text="Other" />
                  </Select>

                  <TextInput
                    id="subject"
                    name="subject"
                    labelText="Subject"
                    placeholder="Brief description of your feedback"
                    value={formData.subject}
                    onChange={handleInputChange}
                    required
                  />

                  <TextArea
                    id="message"
                    name="message"
                    labelText="Message"
                    placeholder="Please provide detailed feedback..."
                    value={formData.message}
                    onChange={handleInputChange}
                    rows={8}
                    required
                  />

                  <div style={{ display: 'flex', gap: 'var(--cds-spacing-05)' }}>
                    <Button
                      type="submit"
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? 'Submitting...' : 'Submit Feedback'}
                    </Button>
                    <Button
                      kind="secondary"
                      type="button"
                      onClick={() => setFormData({
                        name: '',
                        email: '',
                        category: '',
                        subject: '',
                        message: '',
                      })}
                      disabled={isSubmitting}
                    >
                      Clear Form
                    </Button>
                  </div>
                </Stack>
              </Form>
            </Column>
          </Grid>
        </Stack>
      </Column>
    </Grid>
  );
};

export default FeedbackPage;

// Made with Bob
