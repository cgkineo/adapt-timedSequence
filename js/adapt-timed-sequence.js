
define(function(require) {

	var QuestionView = require('coreViews/questionView');
	var Adapt = require('coreJS/adapt');

	var TimedSequence = QuestionView.extend({

		events: {
	            "click .sequence-start-button":"onStartClicked",
	            "click .sequence-answer-button":"onAnswerClicked"
		},
	
		preRender:function(){
	            QuestionView.prototype.preRender.apply(this);
	            this.listenTo(Adapt, 'device:changed', this.handleDeviceChanged);
	            this.listenTo(Adapt, 'device:resize', this.handleDeviceResize);
		},
	
		postRender: function() {
			QuestionView.prototype.postRender.apply(this);
			this.$('.timed-sequence-widget').imageready(_.bind(function() {
				this.setupLayout();
				this.setupSequence();
				this.setReadyStatus();
			}, this));
	
			this.userAnswersArray = [];
			this.model.set({
				_userAnswers:this.userAnswersArray
			});
	    
			// removed so timed sequence resets left incase we need to go back
			//if(!this.model.get("_isComplete")) {
			//    this.userAnswersArray = [];
			//    this.model.set({
			//        _userAnswers:this.userAnswersArray
			//    });
			//} else {
			//    this.showCompletedState();
			//}
		},
	
		handleDeviceChanged: function() {
			this.setupLayout();
		},
	
		handleDeviceResize: function() {
			this.setupLayout();
		},
	
		setupLayout: function() {
			this.width = this.$(".sequence-container").width();
			this.$(".sequence-container-inner").css({
				width:this.width * this.model.get("_items").length
			});
			this.$(".sequence-image").css({
				width:this.width
			});
		},
	
		setupSequence: function() {
			this.setupSequenceIndicators();
			this.correctAnswers = 0;
			this.incorrectAnswers = 0;
			this.currentAnswer;
		},
	
		setupSequenceIndicators: function() {
			var itemsLength = this.model.get("_items").length
			this.$(".sequence-indicator").css({
				width:(100 / itemsLength) + "%"
			});
		},
	
		onStartClicked: function(event) {
			if (event) event.preventDefault();
			this.$(".sequence-state-container").velocity({
				top:"-100%"
			},{
				duration:800,
				easing:"swing"
			});
			this.$(".sequence-start-button").removeClass("show");
			this.$(".sequence-answer-button").addClass("show");
			this.stage = 0;
			this.startTimer();
			this.updateIndicator();
		},
	
		onAnswerClicked: function(event) {
			if (event) event.preventDefault();
			if (this.currentAnswer == this.stage) {
				return;
			}
			this.currentAnswer = this.stage;
			this.stopTimer();
			this.endCurrentStage();
		},
	
		startTimer:function() {
			var timerInterval = this.model.get("_timerInterval") * 1000;
			this.timer = setInterval(_.bind(function() {
				this.updateSequence();
			},this), timerInterval);
		},
	
		stopTimer: function() {
			clearInterval(this.timer);
		},
	
		updateSequence: function() {
			this.checkUserAnswer();
			if (this.stage == this.model.get("_items").length - 1) {
				this.endSequence();
			} else {
				this.showNextImage();
			}
		},
	
		showNextImage: function() {
			this.stage++;
			this.$('.sequence-container-inner').velocity({
				marginLeft:-(this.stage * this.width) + "px"
			});
			this.updateIndicator();
		},
	
		updateIndicator: function() {
			var timerInterval = this.model.get("_timerInterval") * 1000;
			var $indicator = this.$(".sequence-indicator").eq(this.stage);
			var $indicatorInner = $indicator.children(".sequence-indicator-inner");
			$indicatorInner.animate({
				width:"100%"
			}, timerInterval);
		},
	
		endSequence: function() {
			var that = this;
			this.stopTimer();
			this.$(".sequence-state-container").addClass("complete");
			this.$(".sequence-answer-button").removeClass("show");
			this.$(".sequence-complete-button").addClass("show");
			this.$(".sequence-state-container").velocity("reverse", function() {
				that.readyForMarking();
	            	});
		},
	
		readyForMarking: function() {
			if (this.isCorrect()) {
				this.onQuestionCorrect();
			} else {
				this.onQuestionIncorrect(); 
			}
	
			this.setCompletionStatus();
			this.showFeedback();
		},
	
		isCorrect: function() {
			return this.correctAnswers == this.model.get("_items").length;
		},
	
		isPartlyCorrect: function() {
			return this.incorrectAnswers <= this.model.get("_answerLeniency");
		},
	
		checkUserAnswer: function() {
			var userDidInteract = this.checkUserInteraction();
			var answer = this.markAnswer(userDidInteract);
	
			var userAnswer = {
				_isCorrect:answer
			};
	
			this.userAnswersArray.push(userAnswer);
			this.model.set({
				_userAnswers:this.userAnswersArray
			});
	
			this.updateAnswerCounters(answer);
			this.showIndicatorMarking();
			this.showSequenceFeedback(userAnswer);
		},
	
		checkUserInteraction: function() {
			if (this.currentAnswer == this.stage) {
				return true;
			} else {
				return false;
			}
		},
	
		markAnswer: function(userDidInteract) {
			var shouldBeSelected = this.model.get("_items")[this.stage]._shouldBeSelected;
			if (userDidInteract) {
				if (shouldBeSelected) {
					return true;
				} else {
					return false;
			}
			} else if (!userDidInteract) {
				if (shouldBeSelected) {
					return false;
				} else {
					return true;
				}
			}
		},
	
		updateAnswerCounters: function(answer) {
			if(answer) {
				this.correctAnswers++;
			} else {
				this.incorrectAnswers++;
			}
		},
	
		showIndicatorMarking: function() {
			_.each(this.model.get("_userAnswers"), _.bind(function(item, index) {
				var $indicator = this.$(".sequence-indicator").eq(index);
				if (item._isCorrect) {
					$indicator.children(".icon-tick").addClass("show");
				} else {
					$indicator.children(".icon-cross").addClass("show");
				}
			}, this));
		},
	
		showSequenceFeedback: function(userAnswer) {
			var $feedbackContainer = this.$(".sequence-feedback-container");
			var $feedbackIcon;
			if (userAnswer._isCorrect) {
				$feedbackIcon = $feedbackContainer.children(".icon-tick");
			} else {
				$feedbackIcon = $feedbackContainer.children(".icon-cross");
			}
			this.animateFeedbackIcon($feedbackIcon);
		},
	
		animateFeedbackIcon: function($element) {
			$element.velocity({ 
				opacity: 1 
			}, 50, function() {
				$element.velocity({ 
					opacity: 0
				}, 500);
			});
	        },
	
		endCurrentStage: function() {
			this.checkUserAnswer();
			var $indicator = this.$(".sequence-indicator").eq(this.stage);
			$indicator.children(".sequence-indicator-inner").stop().animate({
				width:100 + "%"
			}, 500, _.bind(function() {
				this.startFromNextStage();
			}, this));
		},
	
		startFromNextStage: function() {
			if (this.stage == this.model.get("_items").length - 1) {
				this.endSequence();
			} else {
				this.showNextImage();
				this.startTimer();
			}
		},
	
		showCompletedState: function() {
			this.$(".sequence-state-container").addClass("complete");
			this.$(".sequence-answer-button, .sequence-start-button").removeClass("show");
			this.$(".sequence-complete-button").addClass("show");
			this.$(".sequence-indicator-inner").css({
				width:100 + "%"
			});
			this.showIndicatorMarking();
		}
	});

	Adapt.register("timed-sequence", TimedSequence);
	return TimedSequence;
});
