
define(function(require) {

	var QuestionView = require("coreViews/questionView");
	var Adapt = require("coreJS/adapt");

	var TimedSequence = QuestionView.extend({

		events: {
			"click .sequence-start-button":"onStartClicked",
			"click .sequence-answer-button":"onAnswerClicked"
		},

		preRender:function(){
			QuestionView.prototype.preRender.apply(this);
			this.listenTo(Adapt, "device:changed", this.onDeviceChanged);
			this.listenTo(Adapt, "device:resize", this.onDeviceResized);
		},

		postRender: function() {
			QuestionView.prototype.postRender.apply(this);
			this.$(".timed-sequence-widget").imageready(_.bind(this.onWidgetImageReady, this));
		},

		setupLayout: function() {
			this.width = this.$(".sequence-container").width();
			this.$(".sequence-container-inner").css("width", this.width * this.model.get("_items").length);
			this.$(".sequence-image").css("width", this.width);
		},

		setupSequence: function() {
			this.model.set({
				_currentStageIndex: 0,
				_correctAnswers: 0,
				_incorrectAnswers: 0,
				_currentAnswer: undefined,
			});

			this.setupSequenceIndicators();
		},

		setupSequenceIndicators: function() {
			var itemsLength = this.model.get("_items").length
			this.$(".sequence-indicator").css("width", (100/itemsLength) + "%");
		},

		startTimer: function() {
			var timerInterval = this.model.get("_timerInterval")*1000;
			this.timer = setInterval(_.bind(this.onTimerInterval,this), timerInterval);
		},

		stopTimer: function() {
			clearInterval(this.timer);
		},

		updateSequence: function() {
			this.checkUserAnswer();

			var atLastStage = this.model.get("_currentStageIndex") == this.model.get("_items").length-1;
			if (atLastStage) this.endSequence();
			else this.showNextImage();
		},

		showNextImage: function() {
			this.model.set("_currentStageIndex", this.model.get("_currentStageIndex")+1);
			var leftMarg = -(this.model.get("_currentStageIndex") * this.width);
			this.$(".sequence-container-inner").velocity({ marginLeft: leftMarg + "px" });
			this.updateIndicator();
		},

		updateIndicator: function() {
			var timerInterval = this.model.get("_timerInterval")*1000;
			var $indicator = this.$(".sequence-indicator").eq(this.model.get("_currentStageIndex"));
			var $indicatorInner = $indicator.children(".sequence-indicator-inner");
			$indicatorInner.animate({ width:"100%" }, timerInterval);
		},

		endSequence: function() {
			this.stopTimer();
			this.$(".sequence-state-container").addClass("complete");
			this.$(".sequence-answer-button").removeClass("show");
			this.$(".sequence-complete-button").addClass("show");
			this.$(".sequence-state-container").velocity("reverse", _.bind(this.onQuestionComplete, this));
		},

		isCorrect: function() {
			return this.model.get("_correctAnswers") == this.model.get("_items").length;
		},

		isPartlyCorrect: function() {
			return this.model.get("_incorrectAnswers") <= this.model.get("_answerLeniency");
		},

		checkUserAnswer: function() {
			var isCorrect = this.markAnswer(this.userDidInteract());
			var userAnswer = { _isCorrect:isCorrect };

			this.model.get("_userAnswers").push(userAnswer);

			this.updateAnswerCounters(isCorrect);
			this.showIndicatorMarking();
			this.showSequenceFeedback(userAnswer);
		},

		userDidInteract: function() {
			return this.model.get("_currentAnswer") === this.model.get("_currentStageIndex");
		},

		markAnswer: function(userDidInteract) {
			var shouldBeSelected = this.model.get("_items")[this.model.get("_currentStageIndex")]._shouldBeSelected;
			var correctInteraction = (userDidInteract && shouldBeSelected) || (!userDidInteract && !shouldBeSelected);
			return correctInteraction;
		},

		updateAnswerCounters: function(isCorrect) {
			if(isCorrect) this.model.set("_correctAnswers", this.model.get("_correctAnswers")+1);
			else this.model.set("_incorrectAnswers", this.model.get("_incorrectAnswers"));
		},

		showIndicatorMarking: function() {
			_.each(this.model.get("_userAnswers"), _.bind(function(item, index) {
				var $indicator = this.$(".sequence-indicator").eq(index);
				var iconClass = (item._isCorrect) ? ".icon-tick" : ".icon-cross";
				$indicator.children(iconClass).addClass("show");
			}, this));
		},

		showSequenceFeedback: function(userAnswer) {
			var $feedbackContainer = this.$(".sequence-feedback-container");
			var iconClass = (userAnswer._isCorrect) ? ".icon-tick" : ".icon-cross";
			this.animateFeedbackIcon($feedbackContainer.children(iconClass));
		},

		animateFeedbackIcon: function($element) {
			// quickly fade in, then fade out immediately
			$element.velocity({ opacity: 1 }, 50, function() {
				$element.velocity({ opacity: 0 }, 500);
			});
        },

		endCurrentStage: function() {
			this.checkUserAnswer();
			var $indicator = this.$(".sequence-indicator").eq(this.model.get("_currentStageIndex"));
			$indicator.children(".sequence-indicator-inner").stop().animate({ width:"100%" }, 500, _.bind(this.startFromNextStage, this));
		},

		startFromNextStage: function() {
			var atLastStage = this.model.get("_currentStageIndex") == this.model.get("_items").length-1;
			if (atLastStage) {
				this.endSequence();
			}
			else {
				this.showNextImage();
				this.startTimer();
			}
		},

		showCompletedState: function() {
			this.$(".sequence-state-container").addClass("complete");
			this.$(".sequence-answer-button, .sequence-start-button").removeClass("show");
			this.$(".sequence-complete-button").addClass("show");
			this.$(".sequence-indicator-inner").css("width", "100%");
			this.showIndicatorMarking();
		},

		/**
		* Event handling
		*/

		onDeviceChanged: function() { this.setupLayout(); },
		onDeviceResized: function() { this.setupLayout(); },

		onWidgetImageReady: function() {
			this.model.set("_userAnswers", []);
			this.setupLayout();
			this.setupSequence();
			this.setReadyStatus();
		},

		onStartClicked: function(event) {
			if (event) event.preventDefault();

			this.$(".sequence-state-container").velocity({ top:"-100%" },{ duration:800, easing:"swing" });
			this.$(".sequence-start-button").removeClass("show");
			this.$(".sequence-answer-button").addClass("show");

			this.startTimer();
			this.updateIndicator();
		},

		onAnswerClicked: function(event) {
			if (event) event.preventDefault();

			if (this.model.get("_currentAnswer") == this.model.get("_currentStageIndex")) return;
			this.model.set("_currentAnswer", this.model.get("_currentStageIndex"));
			this.stopTimer();
			this.endCurrentStage();
		},

		onQuestionComplete: function() {
			this.setCompletionStatus();

			this.updateAttempts();
			this.setQuestionAsSubmitted();
			this.storeUserAnswer();
			this.markQuestion();
			this.setScore();
			this.setupFeedback();
			this.showFeedback();
		},

		onTimerInterval: function() {
			this.updateSequence();
		}
	});

	Adapt.register("timed-sequence", TimedSequence);
	return TimedSequence;
});
