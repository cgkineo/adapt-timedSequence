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

			_.bindAll(this, "onWidgetImageReady", "onTimerInterval", "onQuestionComplete", "updateSequence");

			this.listenTo(Adapt, "device:changed device:resize", this.setupLayout);
		},

		postRender: function() {
			QuestionView.prototype.postRender.apply(this);
			this.$(".timed-sequence-widget").imageready(this.onWidgetImageReady);
		},

		setupLayout: function() {
			this.width = this.$(".sequence-container").width();
			this.$(".sequence-container-inner").css("width", this.width * this.model.get("_items").length);
			this.$(".sequence-image").css("width", this.width);
		},

		setupSequenceIndicators: function() {
			var itemsLength = this.model.get("_items").length;
			this.$(".sequence-indicator").css("width", (100/itemsLength) + "%");
		},

		resetData: function() {
			this.model.set({
				_userAnswers: [],
				_currentStageIndex: 0,
				_lastStageAnswered: -1,
				_correctAnswers: 0,
				_incorrectAnswers: 0
			});
		},

		startTimer: function() {
			var timerInterval = this.model.get("_timerInterval")*1000;
			this.timer = setInterval(this.onTimerInterval, timerInterval);
		},

		stopTimer: function() {
			clearInterval(this.timer);
			this.timer = -1;
		},

		updateSequence: function() {
			this.markAnswer(this.model.get("_currentStageIndex"));

			if (this.atLastStage()) this.endSequence();
			else this.showNextImage();
		},

		showNextImage: function() {
			this.model.set("_currentStageIndex", this.model.get("_currentStageIndex")+1);
			var leftMarg = -(this.model.get("_currentStageIndex") * this.width);
			this.$(".sequence-container-inner").velocity({ marginLeft: leftMarg + "px" });
			this.updateIndicator();

			if(this.timer === -1) this.startTimer();
		},

		endCurrentStage: function() {
			var $indicator = this.$(".sequence-indicator").eq(this.model.get("_currentStageIndex"));
			$indicator.children(".sequence-indicator-inner").stop().animate({ width:"100%" }, 500, this.updateSequence);
		},

		endSequence: function() {
			this.stopTimer();
			this.$(".sequence-state-container").addClass("complete");
			this.$(".sequence-answer-button").removeClass("show");
			this.$(".sequence-complete-button").addClass("show");
			this.$(".sequence-state-container").velocity("reverse", this.onQuestionComplete);
		},

		markAnswer: function(index) {
			var userDidInteract = this.userDidInteract();
			var shouldBeSelected = this.model.get("_items")[index]._shouldBeSelected;
			var correctInteraction = (userDidInteract && shouldBeSelected) || (!userDidInteract && !shouldBeSelected);

			this.model.get("_userAnswers").push({
				_stageID: index,
				_isCorrect:correctInteraction
			});

			if(correctInteraction) this.model.set("_correctAnswers", this.model.get("_correctAnswers")+1);
			else this.model.set("_incorrectAnswers", this.model.get("_incorrectAnswers")+1);

			this.showIndicatorMarking();
			this.showSequenceFeedback(this.model.get("_userAnswers")[index]);
		},

		updateIndicator: function() {
			var timerInterval = this.model.get("_timerInterval")*1000;
			var $indicator = this.$(".sequence-indicator").eq(this.model.get("_currentStageIndex"));
			var $indicatorInner = $indicator.children(".sequence-indicator-inner");
			$indicatorInner.animate({ width:"100%" }, timerInterval);
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
		
		isCorrect: function() {
			return this.model.get("_correctAnswers") === this.model.get("_items").length;
		},

		isPartlyCorrect: function() {
			return this.model.get("_incorrectAnswers") <= this.model.get("_answerLeniency");
		},

		userDidInteract: function() {
			return this.model.get("_lastStageAnswered") === this.model.get("_currentStageIndex");
		},

		atLastStage: function() {
			return this.model.get("_currentStageIndex") == this.model.get("_items").length-1;
		},

		/**
		* Event handling
		*/
		onWidgetImageReady: function() {
			this.resetData();
			this.setupLayout();
			this.setupSequenceIndicators();
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

			if (this.model.get("_lastStageAnswered") == this.model.get("_currentStageIndex")) return;
			this.model.set("_lastStageAnswered", this.model.get("_currentStageIndex"));
			this.stopTimer();
			this.endCurrentStage();
		},

		onQuestionComplete: function() {
			this.setCompletionStatus();
			this.updateAttempts();
			this.setQuestionAsSubmitted();
			this.markQuestion();
			this.setScore();
			this.setupFeedback();
			this.showFeedback();
		},

		onTimerInterval: function() {
			this.updateSequence();
		}
	},{
		template: "timed-sequence"
	});

	Adapt.register("timed-sequence", TimedSequence);

	return TimedSequence;
});