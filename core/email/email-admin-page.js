/**
 * Email Admin Page JavaScript
 *
 * Handles:
 * - Tab switching
 * - Settings form submission
 * - Email logs loading and management
 */

(function() {
	'use strict';

	if (typeof window.ELKARETRO_EMAIL_ADMIN === 'undefined') {
		window.ELKARETRO_EMAIL_ADMIN = {};
	}

	const EmailAdmin = {
		restUrl: '',
		nonce: '',
		currentPage: 1,

		init: function(restUrl, nonce) {
			this.restUrl = restUrl;
			this.nonce = nonce;
			this.initTabs();
			this.initSettingsForm();
			this.initLogs();
		},

		initTabs: function() {
			const buttons = document.querySelectorAll('.elkaretro-email-admin__tab-button');
			const contents = document.querySelectorAll('.elkaretro-email-admin__tab-content');
			
			buttons.forEach(button => {
				button.addEventListener('click', () => {
					const tab = button.dataset.tab;
					
					// Update buttons
					buttons.forEach(b => b.classList.remove('active'));
					button.classList.add('active');
					
					// Update contents
					contents.forEach(c => {
						if (c.dataset.tabContent === tab) {
							c.style.display = 'block';
						} else {
							c.style.display = 'none';
						}
					});
					
					// Load logs if switching to logs tab
					if (tab === 'logs') {
						this.loadLogs();
					}
				});
			});
		},

		initSettingsForm: function() {
			const form = document.getElementById('elkaretro-email-settings-form');
			if (!form) return;
			
			// Load current settings
			this.loadSettings();
			
			// Handle form submit
			form.addEventListener('submit', (e) => {
				e.preventDefault();
				this.saveSettings();
			});

			// Handle test SMTP button
			const testButton = document.getElementById('test_smtp');
			if (testButton) {
				testButton.addEventListener('click', () => {
					this.testSMTP();
				});
			}
		},

		loadSettings: function() {
			fetch(this.restUrl + '/settings', {
				method: 'GET',
				headers: {
					'X-WP-Nonce': this.nonce
				}
			})
			.then(res => res.json())
			.then(data => {
				if (data.smtp_enabled !== undefined) {
					document.getElementById('smtp_enabled').checked = data.smtp_enabled;
				}
				if (data.smtp_host) document.getElementById('smtp_host').value = data.smtp_host;
				if (data.smtp_port) document.getElementById('smtp_port').value = data.smtp_port;
				if (data.smtp_secure) document.getElementById('smtp_secure').value = data.smtp_secure;
				if (data.smtp_auth !== undefined) {
					document.getElementById('smtp_auth').checked = data.smtp_auth;
				}
				if (data.smtp_username) document.getElementById('smtp_username').value = data.smtp_username;
				if (data.smtp_password) document.getElementById('smtp_password').value = data.smtp_password;
				if (data.from_name) document.getElementById('from_name').value = data.from_name;
				if (data.from_email) document.getElementById('from_email').value = data.from_email;
			})
			.catch(err => {
				console.error('Failed to load settings:', err);
			});
		},

		saveSettings: function() {
			const form = document.getElementById('elkaretro-email-settings-form');
			const formData = new FormData(form);
			const data = {};
			
			// Handle checkboxes first
			data.smtp_enabled = document.getElementById('smtp_enabled').checked;
			data.smtp_auth = document.getElementById('smtp_auth').checked;
			
			// Handle other fields
			for (const [key, value] of formData.entries()) {
				// Skip checkboxes (already handled)
				if (key === 'smtp_enabled' || key === 'smtp_auth') {
					continue;
				}
				// Store value (empty strings are allowed for optional fields)
				data[key] = value;
			}
			
			fetch(this.restUrl + '/settings', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					'X-WP-Nonce': this.nonce
				},
				body: JSON.stringify(data)
			})
			.then(res => res.json())
			.then(data => {
				if (data.success) {
					alert(EmailAdmin.i18n.settingsSaved || 'Settings saved successfully!');
				} else {
					alert(EmailAdmin.i18n.settingsSaveFailed || 'Failed to save settings.');
				}
			})
			.catch(err => {
				console.error('Failed to save settings:', err);
				alert(EmailAdmin.i18n.settingsSaveError || 'Error saving settings.');
			});
		},

		initLogs: function() {
			const search = document.getElementById('logs_search');
			const status = document.getElementById('logs_status');
			const refresh = document.getElementById('logs_refresh');
			
			if (search) {
				let timeout;
				search.addEventListener('input', () => {
					clearTimeout(timeout);
					timeout = setTimeout(() => {
						this.currentPage = 1;
						this.loadLogs();
					}, 500);
				});
			}
			
			if (status) {
				status.addEventListener('change', () => {
					this.currentPage = 1;
					this.loadLogs();
				});
			}
			
			if (refresh) {
				refresh.addEventListener('click', () => {
					this.loadLogs();
				});
			}
		},

		loadLogs: function() {
			const container = document.getElementById('elkaretro-email-logs-container');
			if (!container) return;
			
			const search = document.getElementById('logs_search')?.value || '';
			const status = document.getElementById('logs_status')?.value || '';
			
			const params = new URLSearchParams({
				per_page: 20,
				page: this.currentPage
			});
			if (search) params.append('search', search);
			if (status) params.append('status', status);
			
			fetch(this.restUrl + '/logs?' + params.toString(), {
				method: 'GET',
				headers: {
					'X-WP-Nonce': this.nonce
				}
			})
			.then(res => res.json())
			.then(data => {
				this.renderLogs(data);
			})
			.catch(err => {
				console.error('Failed to load logs:', err);
				container.innerHTML = '<p>' + (EmailAdmin.i18n.logsLoadError || 'Error loading logs.') + '</p>';
			});
		},

		renderLogs: function(data) {
			const container = document.getElementById('elkaretro-email-logs-container');
			const pagination = document.getElementById('elkaretro-email-logs-pagination');
			
			if (!data.logs || data.logs.length === 0) {
				container.innerHTML = '<p>' + (EmailAdmin.i18n.noLogsFound || 'No logs found.') + '</p>';
				pagination.innerHTML = '';
				return;
			}
			
			let html = '<table class="wp-list-table widefat fixed striped">';
			html += '<thead><tr>';
			html += '<th>' + (EmailAdmin.i18n.date || 'Date') + '</th>';
			html += '<th>' + (EmailAdmin.i18n.to || 'To') + '</th>';
			html += '<th>' + (EmailAdmin.i18n.subject || 'Subject') + '</th>';
			html += '<th>' + (EmailAdmin.i18n.status || 'Status') + '</th>';
			html += '<th>' + (EmailAdmin.i18n.actions || 'Actions') + '</th>';
			html += '</tr></thead><tbody>';
			
			data.logs.forEach(log => {
				const date = new Date(log.sent_at);
				const statusClass = log.sent_result === 'sent' ? 'success' : 'error';
				const statusText = log.sent_result === 'sent' 
					? (EmailAdmin.i18n.sent || 'Sent')
					: (EmailAdmin.i18n.failed || 'Failed');
				
				html += '<tr>';
				html += '<td>' + date.toLocaleString() + '</td>';
				html += '<td>' + this.escapeHtml(log.to_email) + '</td>';
				html += '<td>' + this.escapeHtml(log.subject) + '</td>';
				html += '<td><span class="status-' + statusClass + '">' + statusText + '</span></td>';
				html += '<td>';
				html += '<button type="button" class="button button-small delete-log" data-log-id="' + log.id + '">';
				html += (EmailAdmin.i18n.delete || 'Delete');
				html += '</button>';
				html += '</td>';
				html += '</tr>';
			});
			
			html += '</tbody></table>';
			container.innerHTML = html;
			
			// Pagination
			if (data.pages > 1) {
				let paginationHtml = '<div class="elkaretro-email-admin__pagination-controls">';
				if (this.currentPage > 1) {
					paginationHtml += '<button type="button" class="button" data-page="' + (this.currentPage - 1) + '">' + (EmailAdmin.i18n.previous || 'Previous') + '</button>';
				}
				paginationHtml += '<span>' + (EmailAdmin.i18n.page || 'Page') + ' ' + this.currentPage + ' ' + (EmailAdmin.i18n.of || 'of') + ' ' + data.pages + '</span>';
				if (this.currentPage < data.pages) {
					paginationHtml += '<button type="button" class="button" data-page="' + (this.currentPage + 1) + '">' + (EmailAdmin.i18n.next || 'Next') + '</button>';
				}
				paginationHtml += '</div>';
				pagination.innerHTML = paginationHtml;
				
				pagination.querySelectorAll('[data-page]').forEach(btn => {
					btn.addEventListener('click', () => {
						this.currentPage = parseInt(btn.dataset.page);
						this.loadLogs();
					});
				});
			} else {
				pagination.innerHTML = '';
			}
			
			// Delete buttons
			container.querySelectorAll('.delete-log').forEach(btn => {
				btn.addEventListener('click', () => {
					if (confirm(EmailAdmin.i18n.confirmDelete || 'Are you sure you want to delete this log?')) {
						this.deleteLog(btn.dataset.logId);
					}
				});
			});
		},

		deleteLog: function(logId) {
			fetch(this.restUrl + '/logs/' + logId, {
				method: 'DELETE',
				headers: {
					'X-WP-Nonce': this.nonce
				}
			})
			.then(res => res.json())
			.then(data => {
				if (data.success) {
					this.loadLogs();
				} else {
					alert(EmailAdmin.i18n.deleteFailed || 'Failed to delete log.');
				}
			})
			.catch(err => {
				console.error('Failed to delete log:', err);
				alert(EmailAdmin.i18n.deleteError || 'Error deleting log.');
			});
		},

		escapeHtml: function(text) {
			const div = document.createElement('div');
			div.textContent = text;
			return div.innerHTML;
		},

		testSMTP: function() {
			const resultDiv = document.getElementById('smtp_test_result');
			if (!resultDiv) return;

			// Prompt for email address
			const toEmail = prompt(
				this.i18n.testEmailPrompt || 'Enter email address to send test email:',
				''
			);

			if (!toEmail) {
				return; // User cancelled
			}

			// Validate email
			if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(toEmail)) {
				resultDiv.style.display = 'block';
				resultDiv.className = 'elkaretro-email-admin__test-result notice notice-error';
				resultDiv.innerHTML = '<p><strong>' + (this.i18n.testEmailFailed || 'Failed to send test email:') + '</strong> ' + (this.i18n.invalidEmail || 'Invalid email address.') + '</p>';
				return;
			}

			// Show loading state
			resultDiv.style.display = 'block';
			resultDiv.className = 'elkaretro-email-admin__test-result notice notice-info';
			resultDiv.innerHTML = '<p>' + (this.i18n.testEmailSending || 'Sending test email...') + '</p>';

			// Send test email
			fetch(this.restUrl + '/test', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					'X-WP-Nonce': this.nonce
				},
				body: JSON.stringify({
					to_email: toEmail
				})
			})
			.then(res => res.json())
			.then(data => {
				if (data.success) {
					resultDiv.className = 'elkaretro-email-admin__test-result notice notice-success';
					resultDiv.innerHTML = '<p><strong>' + (this.i18n.testEmailSuccess || 'Test email sent successfully! Check your inbox.') + '</strong></p>';
				} else {
					resultDiv.className = 'elkaretro-email-admin__test-result notice notice-error';
					const errorMessage = data.message || data.error_message || 'Unknown error';
					resultDiv.innerHTML = '<p><strong>' + (this.i18n.testEmailFailed || 'Failed to send test email:') + '</strong> ' + this.escapeHtml(errorMessage) + '</p>';
				}
			})
			.catch(err => {
				console.error('Failed to send test email:', err);
				resultDiv.className = 'elkaretro-email-admin__test-result notice notice-error';
				resultDiv.innerHTML = '<p><strong>' + (this.i18n.testEmailFailed || 'Failed to send test email:') + '</strong> ' + this.escapeHtml(err.message || 'Network error') + '</p>';
			});
		},

		i18n: {}
	};

	window.ELKARETRO_EMAIL_ADMIN = EmailAdmin;
})();

